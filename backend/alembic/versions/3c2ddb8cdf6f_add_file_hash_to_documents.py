"""add file hash to documents

Revision ID: 3c2ddb8cdf6f
Revises: f910b45c20ee
Create Date: 2026-07-30 04:22:41.750451

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3c2ddb8cdf6f'
down_revision: Union[str, Sequence[str], None] = 'f910b45c20ee'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("DELETE FROM documents")

    op.add_column(
        "documents",
        sa.Column(
            "file_hash",
            sa.String(length=64),
            nullable=False,
        ),
    )

    op.create_index(
        op.f("ix_documents_file_hash"),
        "documents",
        ["file_hash"],
        unique=True,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        op.f("ix_documents_file_hash"),
        table_name="documents",
    )

    op.drop_column("documents", "file_hash")