// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum BoardRole {
  OWNER
  EDITOR
  VIEWER
}

model User {
  id              String   @id @default(uuid())
  firstName       String
  lastName        String
  country         String?
  phone           String?
  email           String   @unique
  password        String
  emailVerifiedAt DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  boardsOwned     Board[]         @relation("BoardsOwned")
  memberships     BoardMember[]
  tasksCreated    Task[]          @relation("TasksCreated")
  verificationTokens VerificationToken[]
  passwordResetTokens PasswordResetToken[]
}

model VerificationToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())
}

model PasswordResetToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())
}

model Board {
  id        String        @id @default(uuid())
  name      String
  ownerId   String
  owner     User          @relation("BoardsOwned", fields: [ownerId], references: [id], onDelete: Cascade)
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt

  tasks     Task[]
  members   BoardMember[]
  @@index([ownerId])
}

model BoardMember {
  id        String    @id @default(uuid())
  boardId   String
  userId    String
  role      BoardRole
  createdAt DateTime  @default(now())

  board     Board     @relation(fields: [boardId], references: [id], onDelete: Cascade)
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([boardId, userId])
  @@index([userId, boardId])
}
model Task {
  id          String   @id @default(uuid())
  boardId     String
  title       String
  notes       String?
  startAt     DateTime
  endAt       DateTime
  isDone      Boolean  @default(false)
  doneAt      DateTime?      // New: store when task was marked as done
  status      String   @default("pending") // New: "pending" or "expired"
  createdById String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  board       Board    @relation(fields: [boardId], references: [id], onDelete: Cascade)
  createdBy   User     @relation("TasksCreated", fields: [createdById], references: [id])

  @@index([boardId])
  @@index([createdById])
}



exports.register = async (req, res) => {
  const { firstName, lastName, country, phone, email, password } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ message: 'Email already registered' });

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { firstName, lastName, country, phone, email, password: hashed },
  });

  const token = randomToken();
  await prisma.verificationToken.create({
    data: {
      token,
      userId: user.id,
      expiresAt: addHours(new Date(), 24),
    },
  });

  const link = `${APP_URL}/verify-email?token=${token}`;
  await sendMail({
    to: email,
    subject: 'Verify your email',
    html: `<p>Hello ${firstName},</p><p>Verify your account: <a href="${link}">Activate</a></p><p>This link expires in 24 hours.</p>`,
  });
  console.log('Verification link (dev):', link);

  return res.status(201).json({ message: 'Registered. Check your email to verify.' });
};
