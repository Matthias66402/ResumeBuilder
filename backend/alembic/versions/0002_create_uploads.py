"""create uploads table

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-14
"""

import sqlalchemy as sa

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "uploads",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("resume_id", sa.Uuid(), sa.ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("content_type", sa.String(100), nullable=False),
        sa.Column("content", sa.LargeBinary(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_uploads_resume_id", "uploads", ["resume_id"])


def downgrade() -> None:
    op.drop_index("ix_uploads_resume_id", table_name="uploads")
    op.drop_table("uploads")
