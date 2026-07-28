from rest_framework.routers import DefaultRouter

from .views import TicketCommentViewSet, TicketViewSet

router = DefaultRouter()
router.register("tickets", TicketViewSet, basename="ticket")
router.register("ticket-comments", TicketCommentViewSet, basename="ticket-comment")

urlpatterns = router.urls
