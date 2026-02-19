// ============================================================
// WhatsappModule — Módulo do WhatsApp (Baileys + Socket.io)
// Importa Contacts, Conversations e Messages para persistir dados
// ============================================================

import { Module } from '@nestjs/common';
import { ContactsModule } from '../contacts/contacts.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { MessagesModule } from '../messages/messages.module';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappGateway } from './whatsapp.gateway';
import { WhatsappService } from './whatsapp.service';

@Module({
    imports: [ContactsModule, ConversationsModule, MessagesModule],
    controllers: [WhatsappController],
    providers: [WhatsappService, WhatsappGateway],
    exports: [WhatsappService, WhatsappGateway],
})
export class WhatsappModule { }
