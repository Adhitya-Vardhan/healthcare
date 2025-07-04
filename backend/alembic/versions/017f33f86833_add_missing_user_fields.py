"""add_missing_user_fields

Revision ID: 017f33f86833
Revises: 3f4e78e35a52
Create Date: 2025-06-25 12:34:07.707994

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '017f33f86833'
down_revision: Union[str, Sequence[str], None] = '3f4e78e35a52'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('locations', sa.Column('is_active', sa.Boolean(), nullable=True))
    op.add_column('teams', sa.Column('is_active', sa.Boolean(), nullable=True))
    op.add_column('users', sa.Column('must_change_password', sa.Boolean(), nullable=True))
    op.add_column('users', sa.Column('created_at', sa.TIMESTAMP(), nullable=True))
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('users', 'created_at')
    op.drop_column('users', 'must_change_password')
    op.drop_column('teams', 'is_active')
    op.drop_column('locations', 'is_active')
    # ### end Alembic commands ###
