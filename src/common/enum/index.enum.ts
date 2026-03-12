export enum UserRole {
    SUPERADMIN = 'superadmin',
    ADMIN = 'admin',
    CLIENT = 'client',
    MARKET = 'market',
}

export enum MessageType {
    TEXT = 'text',
    IMAGE = 'image',
    AUDIO = 'audio',
}

export enum CommentScope {
    PRODUCT = 'product',
    ELON = 'elon',
}


export enum ElonStatus {
    NEGOTIATION = 'negotiation', // kelishilmada
    AGREED = 'agreed',           // kelishilgan
}

export enum MessageStatus {
    SENDING = 'sending',     // yuborilmoqda
    SENT = 'sent',           // serverga yozildi
    DELIVERED = 'delivered', // qabul qiluvchiga yetdi
    SEEN = 'seen',           // o‘qildi
}

export enum LanguageType {
    UZ = "uz",
    RU = "ru",
}

export enum NotificationType {
    NEW_MESSAGE = 'new_message',   // yangi xabar keldi
    GROUP_JOIN = 'group_join',    // guruhga a'zo qo'shildi
    ELON_COMMENT = 'elon_comment',  // eloningizga komment yozildi
    NEW_ELON = 'new_elon', // yangi elon qo'shildi
}

export enum NotificationRefType {
    GROUP = 'group',
    PRIVATE_CHAT = 'private_chat',
    COMMENT = 'comment',
}