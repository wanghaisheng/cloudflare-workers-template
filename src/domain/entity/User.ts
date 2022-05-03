import { NanoidAdapter } from '@/infra/adapter/uuid/NanoidAdapter'
import { UUID } from '@/infra/adapter/uuid/UUID'

import { Email } from './Email'
import { Password } from './Password'

export class User {
  id?: string;
  email: string;
  password: string;
  name?: string;
  picture?: string;
  isEmailVerified?: boolean = false;
  isActive?: boolean = true;
  createdAt?: Date = new Date();
  updatedAt?: Date = new Date();

  constructor (user: PickProps<User>, uuid: UUID = new NanoidAdapter()) {
    Object.assign(this, user)
    this.id = user.id ?? uuid.generate()
    this.email = new Email(user.email).getEmail()
    this.password = new Password(user.password).getPassword()
    this.name = user.name && this.capitalize(user.name)
  }

  private capitalize (text: string): string {
    return text
      .trim()
      .toLowerCase()
      .replace(/\w\S*/g, (w) => w.replace(/^\w/, (c) => c.toUpperCase()))
  }

  get firstName (): string {
    return this.name?.split(' ')[0] || undefined
  }

  get middleName (): string {
    return this.name?.split(' ').slice(1, -1).join(' ') || undefined
  }

  get lastName (): string {
    const splittedName = this.name?.split(' ')

    return splittedName?.length >= 2 ? splittedName.slice(-1)[0] : undefined
  }

  get nameInitials (): string {
    const [firstLetter, secondLetter] = [
      this.firstName?.charAt(0) || '',
      this.lastName?.charAt(0) || '',
    ]

    return (firstLetter + secondLetter).toUpperCase() || undefined
  }
}
