import { config } from '@/config'
import { Token } from '@/domain/entity/Token'
import { RepositoryFactory } from '@/domain/factory/RepositoryFactory'
import { TokenRepository } from '@/domain/repository/TokenRepository'
import { CfwJWTAdapter } from '@/infra/adapter/jwt/CfwJWTAdapter'
import { JWT } from '@/infra/adapter/jwt/JWT'
import { AppError } from '@/infra/error/AppError'
import { RepositoryFactoryPrisma } from '@/infra/factory/RepositoryFactoryPrisma'

import { RefreshTokenOutputDTO } from './RefreshTokenInputDTO'
import { RefreshTokenInputDTO } from './RefreshTokenOutputDTO'

export class RefreshTokenUseCase {
  tokenRepository: TokenRepository

  constructor(
    readonly repositoryFactory: RepositoryFactory = new RepositoryFactoryPrisma(),
    readonly jwt: JWT = new CfwJWTAdapter(),
  ) {
    this.tokenRepository = repositoryFactory.createTokenRepository()
  }

  async execute(input: RefreshTokenInputDTO): Promise<RefreshTokenOutputDTO> {
    const { refreshToken, ...restInput } = input

    const token = await this.tokenRepository.findByToken(refreshToken)

    if (!token || token.isEmailToken) {
      throw new AppError('Invalid Token', 401)
    }

    const accessToken = await this.jwt.sign(
      {
        id: token.userId,
        roles: ['admin', 'moderator'],
        permissions: ['read_user'],
        exp: Math.floor(Date.now() / 1000) + 60 * config.jwtExpiration,
      },
      config.jwtSecret,
    )

    if (config.renewRefreshTokenExpiration) {
      token.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * config.refreshTokenExpiration)
    }

    const updatedToken = new Token({
      id: token.id,
      userId: token.userId,
      ...restInput,
      expiresAt: token.expiresAt,
      createdAt: token.createdAt,
    })

    await this.tokenRepository.save(updatedToken)

    return {
      accessToken,
      refreshToken: updatedToken.value,
    }
  }
}