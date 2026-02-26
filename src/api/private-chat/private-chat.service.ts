import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PrivateChatEntity } from 'src/core/entity/private-chat.entity';
import { MessageEntity } from 'src/core/entity/message.entity';
import { UserRole } from 'src/common/enum/index.enum';
import { successRes } from 'src/infrastructure/response/success.response';
import { GetOrCreatePrivateChatDto } from './dto/create-private-chat.dto';

@Injectable()
export class PrivateChatService {
  constructor(
    @InjectRepository(PrivateChatEntity)
    private readonly chatRepo: Repository<PrivateChatEntity>,

    @InjectRepository(MessageEntity)
    private readonly msgRepo: Repository<MessageEntity>,
  ) { }

  // ──────────────────────────────────────────────────────────
  // GET or CREATE private chat
  //
  // Qoidalar:
  //   CLIENT  → faqat MARKET ga yoza oladi
  //   MARKET  → faqat CLIENT ga yoza oladi
  //   CLIENT ↔ CLIENT   ❌
  //   MARKET ↔ MARKET   ❌
  //
  // Agar ikki user o'rtasida chat mavjud bo'lsa → messages bilan qaytaramiz
  // Agar yo'q bo'lsa → yangi chat yaratib qaytaramiz
  // ──────────────────────────────────────────────────────────
  async getOrCreate(
    senderId: string,
    senderRole: UserRole,
    dto: GetOrCreatePrivateChatDto,
  ) {
    const { receiverId, receiverRole } = dto;

    // ── Rol validatsiyasi ──────────────────────────────────
    if (senderRole === UserRole.CLIENT && receiverRole !== UserRole.MARKET) {
      throw new BadRequestException('Client faqat Market ga yoza oladi');
    }
    if (senderRole === UserRole.MARKET && receiverRole !== UserRole.CLIENT) {
      throw new BadRequestException('Market faqat Client ga yoza oladi');
    }
    if (
      senderRole === UserRole.ADMIN ||
      senderRole === UserRole.SUPERADMIN
    ) {
      throw new BadRequestException('Admin private chat yarata olmaydi');
    }

    // ── clientId / marketId ni aniqlash ───────────────────
    // Qaysi taraf CLIENT va qaysi MARKET ni aniqlaymiz
    const clientId =
      senderRole === UserRole.CLIENT ? senderId : receiverId;
    const marketId =
      senderRole === UserRole.MARKET ? senderId : receiverId;

    const existing = await this.chatRepo.findOne({
      where: { clientId, marketId, isDeleted: false },
    });

    if (existing) {
      // Chat bor → messages bilan qaytaramiz
      const messages = await this.msgRepo.find({
        where: { privateChatId: existing.id, isDeleted: false },
        order: { createdAt: 'ASC' },
      });
      return successRes({ ...existing, messages });
    }

    // ── Yangi chat yaratamiz ──────────────────────────────
    const chat = this.chatRepo.create({ clientId, marketId });
    const saved = await this.chatRepo.save(chat);

    return successRes({ ...saved, messages: [] }, 201);
  }

  // ──────────────────────────────────────────────────────────
  // Foydalanuvchining barcha private chatlari
  // ──────────────────────────────────────────────────────────
  async getMyChats(userId: string, role: UserRole) {
    let chats: PrivateChatEntity[];

    if (role === UserRole.CLIENT) {
      chats = await this.chatRepo.find({
        where: { clientId: userId, isDeleted: false },
        relations: { market: true },
        order: { createdAt: 'DESC' } as any,
      });
    } else if (role === UserRole.MARKET) {
      chats = await this.chatRepo.find({
        where: { marketId: userId, isDeleted: false },
        relations: { client: true },
        order: { createdAt: 'DESC' } as any,
      });
    } else {
      // ADMIN — barchasini ko'radi
      chats = await this.chatRepo.find({
        where: { isDeleted: false },
        relations: { client: true, market: true },
        order: { createdAt: 'DESC' } as any,
      });
    }

    // Har bir chat uchun oxirgi xabarni ham olamiz
    const chatIds = chats.map((c) => c.id);
    if (!chatIds.length) return successRes([]);

    // lastMessage: har bir chatdan eng so'nggi xabar
    const lastMessages = await this.msgRepo
      .createQueryBuilder('m')
      .where('m.privateChatId IN (:...ids)', { ids: chatIds })
      .andWhere('m.isDeleted = false')
      .distinctOn(['m.privateChatId'])
      .orderBy('m.privateChatId')
      .addOrderBy('m.createdAt', 'DESC')
      .getMany();

    const lastMsgMap = new Map(lastMessages.map((m) => [m.privateChatId, m]));

    const result = chats.map((c) => ({
      ...c,
      lastMessage: lastMsgMap.get(c.id) ?? null,
    }));

    return successRes(result);
  }
}
