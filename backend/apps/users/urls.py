from django.urls import path

from .views import LogoutView, MeView

urlpatterns = [
    path("auth/me/", MeView.as_view(), name="me"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
]
