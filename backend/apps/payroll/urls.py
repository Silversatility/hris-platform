from rest_framework.routers import DefaultRouter

from .views import (
    CommissionLineItemViewSet,
    CommissionPayoutViewSet,
    PayRunViewSet,
    PayslipLineItemViewSet,
    PayslipViewSet,
    SalesAgentViewSet,
    SaleViewSet,
)

router = DefaultRouter()
router.register("sales-agents", SalesAgentViewSet, basename="sales-agent")
router.register("sales", SaleViewSet, basename="sale")
router.register("pay-runs", PayRunViewSet, basename="pay-run")
router.register("payslips", PayslipViewSet, basename="payslip")
router.register("payslip-line-items", PayslipLineItemViewSet, basename="payslip-line-item")
router.register("commission-payouts", CommissionPayoutViewSet, basename="commission-payout")
router.register(
    "commission-line-items", CommissionLineItemViewSet, basename="commission-line-item"
)

urlpatterns = router.urls
