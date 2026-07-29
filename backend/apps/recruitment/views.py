from rest_framework import permissions, viewsets

from apps.common.permissions import IsStaffOrReadOnly

from .models import JobPosting
from .serializers import JobPostingSerializer


class JobPostingViewSet(viewsets.ModelViewSet):
    queryset = JobPosting.objects.select_related(
        "department", "branch", "posted_by", "posted_by__user"
    )
    serializer_class = JobPostingSerializer
    permission_classes = [permissions.IsAuthenticated, IsStaffOrReadOnly]
    filterset_fields = ["status", "department", "branch", "employment_type"]

    def perform_create(self, serializer):
        serializer.save(posted_by=getattr(self.request.user, "employee", None))
