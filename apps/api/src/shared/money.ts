import { Prisma } from '@prisma/client'

export type MoneyInput = number | string | Prisma.Decimal

export function toDecimal(value: MoneyInput): Prisma.Decimal {
  return new Prisma.Decimal(value)
}

export function toNumber(value: MoneyInput): number {
  return Number(value.toString())
}

export function roundMoney(value: MoneyInput): Prisma.Decimal {
  return new Prisma.Decimal(value).toDecimalPlaces(2)
}

export function sumMoney(values: MoneyInput[]): Prisma.Decimal {
  return values.reduce<Prisma.Decimal>((sum, value) => sum.plus(value), new Prisma.Decimal(0))
}
