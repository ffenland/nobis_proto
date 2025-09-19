-- AlterEnum
ALTER TYPE "ImageType" ADD VALUE 'SIGNATURE';

-- AlterTable
ALTER TABLE "PtProduct" ALTER COLUMN "closedAt" SET DEFAULT TIMESTAMP '2199-12-31 23:59:59';

-- CreateTable
CREATE TABLE "PtSurvey" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PtSurvey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PtSurveyQuestion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "surveyId" UUID NOT NULL,
    "questionText" TEXT NOT NULL,
    "questionType" TEXT NOT NULL,
    "options" TEXT[],
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PtSurveyQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PtSurveyResponse" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "surveyId" UUID NOT NULL,
    "memberId" UUID NOT NULL,
    "trainerId" UUID NOT NULL,
    "signatureImageId" UUID,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PtSurveyResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PtSurveyQuestionResponse" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "responseId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PtSurveyQuestionResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PtSurveyQuestion_surveyId_idx" ON "PtSurveyQuestion"("surveyId");

-- CreateIndex
CREATE INDEX "PtSurveyQuestion_order_idx" ON "PtSurveyQuestion"("order");

-- CreateIndex
CREATE INDEX "PtSurveyResponse_surveyId_idx" ON "PtSurveyResponse"("surveyId");

-- CreateIndex
CREATE INDEX "PtSurveyResponse_memberId_idx" ON "PtSurveyResponse"("memberId");

-- CreateIndex
CREATE INDEX "PtSurveyResponse_trainerId_idx" ON "PtSurveyResponse"("trainerId");

-- CreateIndex
CREATE INDEX "PtSurveyResponse_completedAt_idx" ON "PtSurveyResponse"("completedAt");

-- CreateIndex
CREATE INDEX "PtSurveyQuestionResponse_responseId_idx" ON "PtSurveyQuestionResponse"("responseId");

-- CreateIndex
CREATE INDEX "PtSurveyQuestionResponse_questionId_idx" ON "PtSurveyQuestionResponse"("questionId");

-- AddForeignKey
ALTER TABLE "PtSurveyQuestion" ADD CONSTRAINT "PtSurveyQuestion_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "PtSurvey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtSurveyResponse" ADD CONSTRAINT "PtSurveyResponse_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "PtSurvey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtSurveyResponse" ADD CONSTRAINT "PtSurveyResponse_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtSurveyResponse" ADD CONSTRAINT "PtSurveyResponse_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtSurveyResponse" ADD CONSTRAINT "PtSurveyResponse_signatureImageId_fkey" FOREIGN KEY ("signatureImageId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtSurveyQuestionResponse" ADD CONSTRAINT "PtSurveyQuestionResponse_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "PtSurveyResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtSurveyQuestionResponse" ADD CONSTRAINT "PtSurveyQuestionResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PtSurveyQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
