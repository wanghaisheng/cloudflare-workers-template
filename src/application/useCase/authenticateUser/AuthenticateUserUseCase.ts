import { config } from '@/config'
import { Password } from '@/domain/entity/Password'
import { Token } from '@/domain/entity/Token'
import { RepositoryFactory } from '@/domain/factory/RepositoryFactory'
import { TokenRepository } from '@/domain/repository/TokenRepository'
import { UserRepository } from '@/domain/repository/UserRepository'
import { BcryptjsHashAdapter } from '@/infra/adapter/hash/BcryptjsHashAdapter'
import { Hash } from '@/infra/adapter/hash/Hash'
import { CfwJWTAdapter } from '@/infra/adapter/jwt/CfwJWTAdapter'
import { JWT } from '@/infra/adapter/jwt/JWT'
import { NanoidAdapter } from '@/infra/adapter/uuid/NanoidAdapter'
import { UUID } from '@/infra/adapter/uuid/UUID'
import { AppError } from '@/infra/error/AppError'
import { RepositoryFactoryPrisma } from '@/infra/factory/RepositoryFactoryPrisma'

import { AuthenticateUserInputDTO } from './AuthenticateUserInputDTO'
import { AuthenticateUserOutputDTO } from './AuthenticateUserOutputDTO'

export class AuthenticateUserUseCase {
  userRepository: UserRepository
  tokenRepository: TokenRepository

  constructor(
    readonly repositoryFactory: RepositoryFactory = new RepositoryFactoryPrisma(),
    readonly hash: Hash = new BcryptjsHashAdapter(),
    readonly uuid: UUID = new NanoidAdapter(),
    readonly jwt: JWT = new CfwJWTAdapter(),
  ) {
    this.userRepository = repositoryFactory.createUserRepository()
    this.tokenRepository = repositoryFactory.createTokenRepository()
  }

  async execute(input: AuthenticateUserInputDTO): Promise<AuthenticateUserOutputDTO> {
    const { email, password, ...restInput } = input

    const user = await this.userRepository.findByEmail(email)

    if (!user) {
      throw new AppError('Invalid Password', 401) // avoid exposing the non-existence of the user
    }

    if (!(await Password.isValid(password, user.password, this.hash))) {
      throw new AppError('Invalid Password', 401)
    }

    /**
     * @attention Consider not storing this information in JWT and caching roles and permissions in KV
     * Then retrieve the information inside the isUser/canUser middlewares and validate it
     * So to retrieve this information on the client-side use a /me route, for example
     */
    const accessToken = await this.jwt.sign(
      {
        id: user.id,
        roles: ['admin', 'moderator'],
        permissions: ['read_user'],
        exp: Math.floor(Date.now() / 1000) + 60 * config.jwtExpiration,
      },
      config.jwtSecret,
    )

    const token = new Token(
      {
        userId: user.id,
        ...restInput,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * config.refreshTokenExpiration),
      },
      this.uuid,
    )

    await this.tokenRepository.save(token)

    return {
      accessToken,
      refreshToken: token.value,
    }
  }
}
