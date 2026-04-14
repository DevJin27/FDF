import { Platform } from '@prisma/client'

export interface PricingInput {
  subtotal: number
  platform: Platform
  minimumOrder: number
}

export interface PricingResult {
  subtotal: number
  deliveryGap: number
  qualifiesForFreeDelivery: boolean
  platformFee: number
  payableTotal: number
}

interface PricingStrategy {
  quote(input: PricingInput): PricingResult
}

class StandardPricingStrategy implements PricingStrategy {
  constructor(private readonly platformFee: number) {}

  quote(input: PricingInput): PricingResult {
    const deliveryGap = Math.max(0, input.minimumOrder - input.subtotal)
    return {
      subtotal: input.subtotal,
      deliveryGap,
      qualifiesForFreeDelivery: deliveryGap === 0,
      platformFee: this.platformFee,
      payableTotal: input.subtotal + this.platformFee,
    }
  }
}

const strategies: Record<Platform, PricingStrategy> = {
  BLINKIT: new StandardPricingStrategy(4),
  SWIGGY: new StandardPricingStrategy(7),
  ZEPTO: new StandardPricingStrategy(5),
}

// Pattern: Strategy - platform pricing can vary without branching in controllers.
export function quotePrice(input: PricingInput): PricingResult {
  return strategies[input.platform].quote(input)
}
