-- CreateTable
CREATE TABLE "Desk" (
    "id" TEXT NOT NULL,
    "floor" INTEGER NOT NULL,
    "floorName" TEXT NOT NULL,
    "seatNumber" INTEGER NOT NULL,
    "hasSocket" BOOLEAN NOT NULL DEFAULT false,
    "nearWindow" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'available',
    "studentId" TEXT,
    "studentName" TEXT,
    "checkedInAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Desk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibraryConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL DEFAULT 'Central University Library',
    "openTime" TEXT NOT NULL DEFAULT '08:00',
    "closeTime" TEXT NOT NULL DEFAULT '22:00',
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "announcement" TEXT NOT NULL DEFAULT 'Please keep quiet on Floor 2.',

    CONSTRAINT "LibraryConfig_pkey" PRIMARY KEY ("id")
);
