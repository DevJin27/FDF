import { PrismaClient } from '@prisma/client'
import { CreateCartItemDto, serializeCartItem } from '../../shared/types'

export class CartRepository {
  constructor(private readonly db: PrismaClient) {}

  async addItem(dto: CreateCartItemDto) {
    const item = await this.db.cartItem.create({
      data: {
        sessionId: dto.sessionId,
        memberId: dto.memberId,
        itemId: dto.itemId ?? null,
        name: dto.name,
        price: dto.price,
        quantity: dto.quantity,
      },
    })
    return serializeCartItem(item)
  }

  async removeItem(id: string): Promise<void> {
    await this.db.cartItem.delete({ where: { id } })
  }

  async findById(id: string) {
    const item = await this.db.cartItem.findUnique({ where: { id } })
    return item ? serializeCartItem(item) : null
  }

  async findBySession(sessionId: string) {
    const items = await this.db.cartItem.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    })
    return items.map(serializeCartItem)
  }
}
