from rest_framework.routers import DefaultRouter

from .views import JobPostingViewSet

router = DefaultRouter()
router.register("job-postings", JobPostingViewSet, basename="jobposting")

urlpatterns = router.urls
