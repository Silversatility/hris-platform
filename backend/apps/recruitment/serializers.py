from rest_framework import serializers

from .models import JobPosting


class JobPostingSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    branch_name = serializers.CharField(source="branch.name", read_only=True)
    employment_type_display = serializers.CharField(
        source="get_employment_type_display", read_only=True
    )
    posted_by_name = serializers.SerializerMethodField()

    class Meta:
        model = JobPosting
        fields = [
            "id",
            "title",
            "department",
            "department_name",
            "branch",
            "branch_name",
            "employment_type",
            "employment_type_display",
            "description",
            "requirements",
            "status",
            "closing_date",
            "posted_by",
            "posted_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["posted_by", "created_at", "updated_at"]

    def get_posted_by_name(self, obj):
        if obj.posted_by is None:
            return None
        full_name = f"{obj.posted_by.user.first_name} {obj.posted_by.user.last_name}".strip()
        return full_name or obj.posted_by.user.email
