"""create resumes table

Revision ID: 0001
Revises:
Create Date: 2026-10-14
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "resumes",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("source_filename", sa.String(255)),
        sa.Column("raw_text", sa.Text()),
        sa.Column("data", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_resumes_created_at", "resumes", [sa.text("created_at DESC")])


def downgrade() -> None:
    op.drop_index("ix_resumes_created_at", table_name="resumes")
    op.drop_table("resumes")
