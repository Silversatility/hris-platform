from rest_framework import serializers

from .models import JobPosting


class JobPostingSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    branch_name = serializers.CharField(source="branch.name", read_only=True)
    work_setup_display = serializers.CharField(source="get_work_setup_display", read_only=True)
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
            "work_setup",
            "work_setup_display",
            "employment_type",
            "employment_type_display",
            "available_slots",
            "min_salary",
            "max_salary",
            "description",
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

    def validate(self, attrs):
        min_salary = attrs.get("min_salary", getattr(self.instance, "min_salary", None))
        max_salary = attrs.get("max_salary", getattr(self.instance, "max_salary", None))
        if min_salary is not None and max_salary is not None and max_salary < min_salary:
            raise serializers.ValidationError(
                "max_salary must be greater than or equal to min_salary."
            )
        return attrs
