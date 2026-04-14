import { Platform, PrismaClient } from '@prisma/client'
import { serializeItem } from '../../shared/types'

const fallbackCatalog = [
  { id: 'fallback-swiggy-1', platform: Platform.SWIGGY, name: 'Paneer Wrap', description: 'Fast dinner add-on', price: 149, imageUrl: null, active: true },
  { id: 'fallback-swiggy-2', platform: Platform.SWIGGY, name: 'Cold Coffee', description: 'Shared cart favorite', price: 119, imageUrl: null, active: true },
  { id: 'fallback-blinkit-1', platform: Platform.BLINKIT, name: 'Milk + Bread Combo', description: 'Daily essentials', price: 96, imageUrl: null, active: true },
  { id: 'fallback-blinkit-2', platform: Platform.BLINKIT, name: 'Snack Pack', description: 'Chips, dip, and cola', price: 185, imageUrl: null, active: true },
  { id: 'fallback-zepto-1', platform: Platform.ZEPTO, name: 'Fruit Bowl', description: 'Fresh and quick', price: 129, imageUrl: null, active: true },
  { id: 'fallback-zepto-2', platform: Platform.ZEPTO, name: 'Late Night Basics', description: 'Maggi, curd, and soda', price: 164, imageUrl: null, active: true },
]

export class ItemRepository {
  constructor(private readonly db: PrismaClient) {}

  async list(platform?: Platform) {
    const items = await this.db.item.findMany({
      where: { active: true, ...(platform ? { platform } : {}) },
      orderBy: [{ platform: 'asc' }, { name: 'asc' }],
    })

    if (items.length > 0) return items.map(serializeItem)

    return fallbackCatalog.filter((item) => !platform || item.platform === platform)
  }
}
