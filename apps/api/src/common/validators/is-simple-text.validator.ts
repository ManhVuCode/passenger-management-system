import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator'

@ValidatorConstraint({ name: 'isSimpleText', async: false })
export class IsSimpleTextConstraint implements ValidatorConstraintInterface {
  validate(value: unknown) {
    if (typeof value !== 'string') return false
    return /^[a-zA-ZÀ-ỹ0-9\s\-]+$/.test(value)
  }

  defaultMessage() {
    return 'Only letters, numbers, spaces, and hyphens (-) are allowed'
  }
}

export function IsSimpleText(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [],
      validator: IsSimpleTextConstraint,
    })
  }
}
