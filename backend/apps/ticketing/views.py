from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from apps.notifications.models import notify
from apps.users.models import User

from .models import Ticket, TicketComment
from .permissions import CanManageTicket
from .serializers import AssignTicketSerializer, TicketCommentSerializer, TicketSerializer


def _display_name(employee):
    full_name = f"{employee.user.first_name} {employee.user.last_name}".strip()
    return full_name or employee.user.email


class TicketViewSet(viewsets.ModelViewSet):
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated, CanManageTicket]
    filterset_fields = ["status", "priority", "category", "assigned_to"]

    def get_permissions(self):
        if self.action in {"assign", "resolve", "close", "reopen"}:
            return [permissions.IsAuthenticated()]
        return super().get_permissions()

    def get_queryset(self):
        queryset = Ticket.objects.select_related(
            "requester", "requester__user", "assigned_to", "assigned_to__user"
        ).prefetch_related("comments", "comments__author")
        user = self.request.user
        if user.is_staff:
            return queryset
        employee = getattr(user, "employee", None)
        if employee is None:
            return queryset.none()
        return queryset.filter(Q(requester=employee) | Q(assigned_to=employee))

    def perform_create(self, serializer):
        ticket = serializer.save(requester=self.request.user.employee)
        for staff_user in User.objects.filter(is_staff=True):
            notify(
                staff_user,
                f"New {ticket.get_priority_display().lower()} priority ticket: {ticket.subject} "
                f"({_display_name(ticket.requester)})",
                link="/tickets",
            )

    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        ticket = self.get_object()
        if not request.user.is_staff:
            raise PermissionDenied("Only staff can assign tickets.")
        if ticket.status in (Ticket.Status.RESOLVED, Ticket.Status.CLOSED):
            raise ValidationError("Cannot assign a resolved or closed ticket.")

        serializer = AssignTicketSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ticket.assigned_to = serializer.validated_data["assigned_to"]
        if ticket.status == Ticket.Status.OPEN:
            ticket.status = Ticket.Status.IN_PROGRESS
        ticket.save(update_fields=["assigned_to", "status"])

        notify(
            ticket.requester.user,
            f"Your ticket {ticket.ticket_number} was assigned to "
            f"{_display_name(ticket.assigned_to)}.",
            link="/tickets",
        )

        return Response(self.get_serializer(ticket).data)

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        ticket = self.get_object()
        if not request.user.is_staff:
            raise PermissionDenied("Only staff can resolve tickets.")
        if ticket.status not in (Ticket.Status.OPEN, Ticket.Status.IN_PROGRESS):
            raise ValidationError("Only open or in-progress tickets can be resolved.")

        ticket.status = Ticket.Status.RESOLVED
        ticket.resolved_at = timezone.now()
        ticket.save(update_fields=["status", "resolved_at"])

        notify(
            ticket.requester.user,
            f"Your ticket {ticket.ticket_number} was marked resolved.",
            link="/tickets",
        )

        return Response(self.get_serializer(ticket).data)

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        ticket = self.get_object()
        employee = getattr(request.user, "employee", None)
        is_requester = employee is not None and ticket.requester_id == employee.id
        if not request.user.is_staff and not is_requester:
            raise PermissionDenied("Only the requester or staff can close this ticket.")
        if ticket.status != Ticket.Status.RESOLVED:
            raise ValidationError("Only resolved tickets can be closed.")

        ticket.status = Ticket.Status.CLOSED
        ticket.save(update_fields=["status"])

        return Response(self.get_serializer(ticket).data)

    @action(detail=True, methods=["post"])
    def reopen(self, request, pk=None):
        ticket = self.get_object()
        employee = getattr(request.user, "employee", None)
        is_requester = employee is not None and ticket.requester_id == employee.id
        if not request.user.is_staff and not is_requester:
            raise PermissionDenied("Only the requester or staff can reopen this ticket.")
        if ticket.status not in (Ticket.Status.RESOLVED, Ticket.Status.CLOSED):
            raise ValidationError("Only resolved or closed tickets can be reopened.")

        ticket.status = Ticket.Status.OPEN
        ticket.resolved_at = None
        ticket.save(update_fields=["status", "resolved_at"])

        if ticket.assigned_to is not None:
            notify(
                ticket.assigned_to.user,
                f"Ticket {ticket.ticket_number} was reopened.",
                link="/tickets",
            )
        else:
            for staff_user in User.objects.filter(is_staff=True):
                notify(
                    staff_user, f"Ticket {ticket.ticket_number} was reopened.", link="/tickets"
                )

        return Response(self.get_serializer(ticket).data)


class TicketCommentViewSet(viewsets.ModelViewSet):
    serializer_class = TicketCommentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["ticket"]
    http_method_names = ["get", "post", "head", "options"]

    def _is_participant(self, user, ticket):
        if user.is_staff:
            return True
        employee = getattr(user, "employee", None)
        if employee is None:
            return False
        return ticket.requester_id == employee.id or ticket.assigned_to_id == employee.id

    def get_queryset(self):
        queryset = TicketComment.objects.select_related("ticket", "author")
        user = self.request.user
        if user.is_staff:
            return queryset
        employee = getattr(user, "employee", None)
        if employee is None:
            return queryset.none()
        return queryset.filter(Q(ticket__requester=employee) | Q(ticket__assigned_to=employee))

    def perform_create(self, serializer):
        ticket = serializer.validated_data["ticket"]
        if not self._is_participant(self.request.user, ticket):
            raise PermissionDenied("You can only comment on tickets you're part of.")

        serializer.save(author=self.request.user)

        employee = getattr(self.request.user, "employee", None)
        is_requester = employee is not None and ticket.requester_id == employee.id
        if is_requester:
            if ticket.assigned_to is not None:
                notify(
                    ticket.assigned_to.user,
                    f"New comment on {ticket.ticket_number}.",
                    link="/tickets",
                )
        else:
            notify(
                ticket.requester.user,
                f"New comment on your ticket {ticket.ticket_number}.",
                link="/tickets",
            )
