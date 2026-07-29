from rest_framework.routers import DefaultRouter

from .views import COERequestViewSet

router = DefaultRouter()
router.register("coe-requests", COERequestViewSet, basename="coerequest")

urlpatterns = router.urls
