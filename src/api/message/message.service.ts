import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MessageEntity } from 'src/core/entity/message.entity';
import { MessageStatus, MessageType, UserRole } from 'src/common/enum/index.enum';
import { successRes } from 'src/infrastructure/response/success.response';
import { UpdateMessageDto } from './dto/update-message.dto';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(MessageEntity)
    private readonly msgRepo: Repository<MessageEntity>,
  ) { }

  // ──────────────────────────────────────────────
  // Xabarni tahrirlash
  // Faqat yuborganchi o'zi va faqat TEXT xabarlarni
  // ──────────────────────────────────────────────
  async editMessage(
    id: string,
    dto: UpdateMessageDto,
    requesterId: string,
    requesterRole: UserRole,
  ) {
    const msg = await this.msgRepo.findOne({ where: { id, isDeleted: false } });
    if (!msg) throw new NotFoundException('Message not found');

    // Faqat yuborganchi tahrirlaydi
    if (msg.senderId !== requesterId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    // Faqat TEXT xabarlar tahrirlanadi
    if (msg.type !== MessageType.TEXT) {
      throw new BadRequestException('Only text messages can be edited');
    }

    if (!dto.text?.trim()) {
      throw new BadRequestException('Message text cannot be empty');
    }

    msg.text = dto.text.trim();
    const saved = await this.msgRepo.save(msg);
    return successRes(saved);
  }

  // ──────────────────────────────────────────────
  // Xabarni o'chirish
  // Yuborganchi yoki Admin/Superadmin
  // ──────────────────────────────────────────────
  async deleteMessage(
    id: string,
    requesterId: string,
    requesterRole: UserRole,
  ) {
    const msg = await this.msgRepo.findOne({ where: { id, isDeleted: false } });
    if (!msg) throw new NotFoundException('Message not found');

    const isAdmin =
      requesterRole === UserRole.ADMIN ||
      requesterRole === UserRole.SUPERADMIN;

    const isOwner = msg.senderId === requesterId;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    await this.msgRepo.update(id, {
      isDeleted: true,
      deletedAt: new Date(),
    } as any);
    return successRes({ deleted: true });
  }

  // ──────────────────────────────────────────────
  // Ko'rildi belgisi (seen)
  // Xabar qabul qiluvchi tomonidan belgilanadi
  // ──────────────────────────────────────────────
  async markSeen(
    id: string,
    requesterId: string,
  ) {
    const msg = await this.msgRepo.findOne({ where: { id, isDeleted: false } });
    if (!msg) throw new NotFoundException('Message not found');

    // Yuborganchi o'z xabarini seen qila olmaydi
    if (msg.senderId === requesterId) {
      throw new ForbiddenException('You cannot mark your own message as seen');
    }

    if (msg.status === MessageStatus.SEEN) {
      return successRes(msg); // allaqachon ko'rilgan
    }

    msg.status = MessageStatus.SEEN;
    const saved = await this.msgRepo.save(msg);
    return successRes(saved);
  }
}
