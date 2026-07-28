from rest_framework.routers import DefaultRouter

from .views import BranchViewSet, DepartmentViewSet, EmployeeViewSet

router = DefaultRouter()
router.register("departments", DepartmentViewSet, basename="department")
router.register("branches", BranchViewSet, basename="branch")
router.register("employees", EmployeeViewSet, basename="employee")

urlpatterns = router.urls
