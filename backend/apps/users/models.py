from django.contrib.auth.models import AbstractUser
from django.db import models

from .managers import UserManager


class User(AbstractUser):
    """Custom user model, authenticated by email instead of username.

    Domain-specific employee data (department, job title, salary, etc.)
    lives in the `employees` app and links back to this model — kept
    separate so auth concerns don't get tangled with HR data.
    """

    username = None
    email = models.EmailField(unique=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return self.email
