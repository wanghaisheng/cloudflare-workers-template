import { NanoidAdapter } from '@/infra/adapter/uuid/NanoidAdapter'
import { UUID } from '@/infra/adapter/uuid/UUID'
import { AppError } from '@/infra/error/AppError'

type TokenType = Omit<PickProps<Token>, 'value'> & {
  value?: string
}

export class Token {
  id?: string
  userId: string
  value: string
  code?: string
  codeAttempts?: number
  userAgent?: string
  lastIp?: string
  asn?: number
  asOrganization?: string
  timezone?: string
  continent?: string
  country?: string
  region?: string
  regionCode?: string
  city?: string
  postalCode?: string
  longitude?: string
  latitude?: string
  isEmailToken?: boolean = false
  expiresAt?: Date
  createdAt?: Date = new Date()
  updatedAt?: Date = new Date()

  constructor(props: TokenType, uuid: UUID = new NanoidAdapter()) {
    if (this.isExpired(props.expiresAt)) {
      throw new AppError('Invalid Token', 401)
    }

    Object.assign(this, props)
    this.id = props.id ?? uuid.generate()
    this.value = props.value ?? uuid.generate(128)
  }

  private isExpired(expiresAt?: Date): boolean {
    return expiresAt && new Date(expiresAt) < new Date(Date.now())
  }
}