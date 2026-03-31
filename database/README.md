# 🗄️ Dewa.fun - Database Management

Panduan lengkap untuk pengelolaan database, migrations, dan schemas.

---

## 📁 Struktur Folder

```
database/
├── migrations/           # Semua migration files (Prisma & Supabase)
├── schemas/              # Schema definitions
│   ├── supabase_schema.sql
│   └── prisma_schema.sql
├── scripts/              # Utility scripts & standalone migrations
│   ├── add_social_persona_to_agents.sql
│   └── utils/
└── README.md            # Dokumentasi ini
```

---

## 🚀 Cara Menjalankan Migrations

### **Prisma Migrations** (Development)

Untuk development dengan Prisma ORM:

```bash
cd apps/frontend

# Run semua migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

### **Supabase Migrations** (Production)

Untuk deployment ke Supabase:

```bash
# 1. Jalankan schema utama
psql $DATABASE_URL -f database/schemas/supabase_schema.sql

# 2. Jalankan migrations secara berurutan
psql $DATABASE_URL -f database/migrations/0001_add_launch_type_tracking.sql
psql $DATABASE_URL -f database/migrations/0002_add_security_mode_tracking.sql
psql $DATABASE_URL -f database/migrations/0003_add_affiliate_rewards.sql
psql $DATABASE_URL -f database/migrations/0004_add_agent_creator_distribution.sql

# 3. Jalankan scripts tambahan (jika perlu)
psql $DATABASE_URL -f database/scripts/add_social_persona_to_agents.sql
```

### **Via Supabase Dashboard**

1. Buka Supabase Dashboard
2. Navigasi ke **SQL Editor**
3. Copy-paste isi file migration yang ingin dijalankan
4. Atau gunakan CLI: `supabase db push`

---

## 📋 Migration History

### **Migration 0001** - Launch Type Tracking
- Menambahkan tracking untuk B2B vs B2C launch
- Kolom baru di tabel vaults dan users

### **Migration 0002** - Security Mode Tracking  
- Menambahkan kolom keamanan untuk VRF timeout
- Circuit breaker fields

### **Migration 0003** - Affiliate Rewards
- Sistem referral rewards
- Affiliate fee tracking

### **Migration 0004** - Agent Creator Distribution
- Agent/Creator fee distribution (25-25-30-20 model)
- Kolom earnings tracking untuk creator & agent

---

## 🛠️ Scripts

### **add_social_persona_to_agents.sql**
Menambahkan konfigurasi persona sosial media untuk AI agents:
- Custom persona prompts
- Posting frequency settings
- Tone configuration
- Platform preferences (Twitter, Telegram)

---

## 🔧 Development Workflow

### **Local Development**
```bash
# 1. Setup database lokal
docker run --name dewa-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:15

# 2. Run migrations
cd apps/frontend
npx prisma migrate dev

# 3. Seed data (opsional)
npx prisma db seed
```

### **Production Deployment**
```bash
# 1. Backup database terlebih dahulu
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# 2. Run migrations
psql $DATABASE_URL -f database/schemas/supabase_schema.sql
psql $DATABASE_URL -f database/migrations/0001_*.sql
# ... lanjutkan dengan migration lainnya
```

---

## 📊 Entity Relationship

### **Core Tables:**

- **users** - User accounts dengan wallet & earnings tracking
- **vaults** - Dice vault untuk setiap token
- **dice_sessions** - Session permainan provably fair
- **bets** - History taruhan dengan fee distribution
- **referrals** - Referral system
- **chat_messages** - Live chat
- **notifications** - User notifications

### **AI Agent Tables:**

- **agent_nodes** - Partner/AI agent configuration
- **agent_memory** - AI state & history
- **node_tokens** - Tokens launched by agents

---

## 🔐 Security Best Practices

1. **Backup Sebelum Migration**
   - Selalu backup database sebelum menjalankan migrations
   - Test di staging environment terlebih dahulu

2. **Idempotent Migrations**
   - Gunakan `IF NOT EXISTS` untuk menghindari error
   - Safe to run multiple times

3. **Transaction Safety**
   - Bungkus migration dengan `BEGIN;` dan `COMMIT;`
   - Rollback otomatis jika ada error

4. **Environment Variables**
   - Jangan commit `.env` file dengan credentials
   - Gunakan `.env.example` sebagai template

---

## 📝 Troubleshooting

### **Migration Gagal**
```bash
# Cek status migrations
npx prisma migrate status

# Reset database (HARUS DI LOCAL SAJA!)
npx prisma migrate reset

# Fix migration conflicts
npx prisma migrate resolve --applied "migration_name"
```

### **Schema Tidak Sinkron**
```bash
# Re-generate Prisma Client
npx prisma generate

# Introspect dari database
npx prisma db pull
```

---

## 📞 Support

Untuk pertanyaan atau issue terkait database:
- Check dokumentasi di `/docs` folder
- Lihat migration files untuk detail perubahan schema
- Contact admin untuk akses production database

---

**Last Updated:** March 28, 2026
