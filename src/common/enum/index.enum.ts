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
