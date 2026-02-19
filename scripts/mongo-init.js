// ============================================================
// Script de inicialização do MongoDB
// Cria o database e collections iniciais
// ============================================================

print('🚀 Inicializando MongoDB para WhatsApp CRM...');

db = db.getSiblingDB('whatsapp-crm');

// Criar collections com validação básica
db.createCollection('users');
db.createCollection('departments');
db.createCollection('whatsapp_sessions');
db.createCollection('contacts');
db.createCollection('tags');
db.createCollection('conversations');
db.createCollection('messages');
db.createCollection('transfers');
db.createCollection('bot_flows');

print('✅ Collections criadas com sucesso');
print('📦 Database: whatsapp-crm');
