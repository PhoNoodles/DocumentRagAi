"""add file path to documents

Revision ID: 9b0092e83eff
Revises: 3c2ddb8cdf6f
Create Date: 2026-07-31 05:10:16.541594

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9b0092e83eff'
down_revision: Union[str, Sequence[str], None] = '3c2ddb8cdf6f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("DELETE FROM documents")

    op.add_column(
        "documents",
        sa.Column(
            "file_path",
            sa.String(length=500),
            nullable=False,
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("documents", "file_path")
