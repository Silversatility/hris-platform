from django.core.management.base import BaseCommand
from django.db import transaction

from apps.employees.models import Department, Employee
from apps.users.models import User

DEMO_PASSWORD = "demo-pass-123"

DEPARTMENTS = [
    {"name": "Engineering", "code": "ENG"},
    {"name": "Human Resources", "code": "HR"},
    {"name": "Finance", "code": "FIN"},
    {"name": "Design", "code": "DES"},
]

# manager_email is resolved in a second pass, after every employee exists.
EMPLOYEES = [
    {
        "email": "maria.delacruz@example.com",
        "first_name": "Maria",
        "last_name": "Delacruz",
        "employee_id": "EMP-2026-001",
        "department_code": "ENG",
        "manager_email": None,
        "job_title": "VP of Engineering",
        "employment_type": Employee.EmploymentType.FULL_TIME,
        "status": Employee.Status.ACTIVE,
        "hire_date": "2019-04-01",
        "salary": "150000.00",
        "phone_number": "+639170000001",
    },
    {
        "email": "mark.garcia@example.com",
        "first_name": "Mark",
        "last_name": "Garcia",
        "employee_id": "EMP-2026-002",
        "department_code": "ENG",
        "manager_email": "maria.delacruz@example.com",
        "job_title": "DevOps Engineer",
        "employment_type": Employee.EmploymentType.FULL_TIME,
        "status": Employee.Status.ACTIVE,
        "hire_date": "2021-11-22",
        "salary": "98000.00",
        "phone_number": "+639221234567",
    },
    {
        "email": "john.santos@example.com",
        "first_name": "John",
        "last_name": "Santos",
        "employee_id": "EMP-2026-003",
        "department_code": "ENG",
        "manager_email": "maria.delacruz@example.com",
        "job_title": "Software Engineer",
        "employment_type": Employee.EmploymentType.FULL_TIME,
        "status": Employee.Status.ACTIVE,
        "hire_date": "2024-03-18",
        "salary": "85000.00",
        "phone_number": "+639171234567",
    },
    {
        "email": "grace.mendoza@example.com",
        "first_name": "Grace",
        "last_name": "Mendoza",
        "employee_id": "EMP-2026-004",
        "department_code": "HR",
        "manager_email": None,
        "job_title": "HR Manager",
        "employment_type": Employee.EmploymentType.FULL_TIME,
        "status": Employee.Status.ACTIVE,
        "hire_date": "2018-02-10",
        "salary": "90000.00",
        "phone_number": "+639180000004",
    },
    {
        "email": "anna.cruz@example.com",
        "first_name": "Anna",
        "last_name": "Cruz",
        "employee_id": "EMP-2026-005",
        "department_code": "HR",
        "manager_email": "grace.mendoza@example.com",
        "job_title": "HR Specialist",
        "employment_type": Employee.EmploymentType.FULL_TIME,
        "status": Employee.Status.ACTIVE,
        "hire_date": "2023-09-11",
        "salary": "52000.00",
        "phone_number": "+639181112223",
    },
    {
        "email": "roberto.tan@example.com",
        "first_name": "Roberto",
        "last_name": "Tan",
        "employee_id": "EMP-2026-006",
        "department_code": "FIN",
        "manager_email": None,
        "job_title": "Finance Manager",
        "employment_type": Employee.EmploymentType.FULL_TIME,
        "status": Employee.Status.ACTIVE,
        "hire_date": "2017-05-19",
        "salary": "110000.00",
        "phone_number": "+639190000006",
    },
    {
        "email": "kevin.reyes@example.com",
        "first_name": "Kevin",
        "last_name": "Reyes",
        "employee_id": "EMP-2026-007",
        "department_code": "FIN",
        "manager_email": "roberto.tan@example.com",
        "job_title": "Finance Analyst",
        "employment_type": Employee.EmploymentType.CONTRACT,
        "status": Employee.Status.ACTIVE,
        "hire_date": "2025-01-06",
        "salary": "68000.00",
        "phone_number": "+639199998888",
    },
    {
        "email": "michael.ong@example.com",
        "first_name": "Michael",
        "last_name": "Ong",
        "employee_id": "EMP-2026-008",
        "department_code": "DES",
        "manager_email": None,
        "job_title": "Design Lead",
        "employment_type": Employee.EmploymentType.FULL_TIME,
        "status": Employee.Status.ACTIVE,
        "hire_date": "2020-08-03",
        "salary": "105000.00",
        "phone_number": "+639150000008",
    },
    {
        "email": "sarah.lim@example.com",
        "first_name": "Sarah",
        "last_name": "Lim",
        "employee_id": "EMP-2026-009",
        "department_code": "DES",
        "manager_email": "michael.ong@example.com",
        "job_title": "UI/UX Designer",
        "employment_type": Employee.EmploymentType.PART_TIME,
        "status": Employee.Status.TERMINATED,
        "hire_date": "2022-06-15",
        "termination_date": "2026-05-31",
        "salary": "40000.00",
        "phone_number": "+639151234321",
    },
]


class Command(BaseCommand):
    help = "Seeds departments, users, and employees with sample HR data for local development."

    @transaction.atomic
    def handle(self, *args, **options):
        departments = {}
        for dept in DEPARTMENTS:
            department, created = Department.objects.get_or_create(
                code=dept["code"], defaults={"name": dept["name"]}
            )
            departments[dept["code"]] = department
            self.stdout.write(f"{'Created' if created else 'Exists'} department: {department}")

        employees = {}
        for data in EMPLOYEES:
            user, user_created = User.objects.get_or_create(
                email=data["email"],
                defaults={"first_name": data["first_name"], "last_name": data["last_name"]},
            )
            if user_created:
                user.set_password(DEMO_PASSWORD)
                user.save(update_fields=["password"])

            employee, emp_created = Employee.objects.get_or_create(
                employee_id=data["employee_id"],
                defaults={
                    "user": user,
                    "department": departments[data["department_code"]],
                    "job_title": data["job_title"],
                    "employment_type": data["employment_type"],
                    "status": data["status"],
                    "hire_date": data["hire_date"],
                    "termination_date": data.get("termination_date"),
                    "salary": data["salary"],
                    "personal_email": data["email"],
                    "phone_number": data["phone_number"],
                },
            )
            employees[data["email"]] = employee
            action = "Created" if emp_created else "Exists"
            self.stdout.write(f"{action} employee: {employee.employee_id} ({user.email})")

        for data in EMPLOYEES:
            if not data["manager_email"]:
                continue
            employee = employees[data["email"]]
            manager = employees[data["manager_email"]]
            if employee.manager_id != manager.id:
                employee.manager = manager
                employee.save(update_fields=["manager"])

        self.stdout.write(self.style.SUCCESS(f"Done. Demo user password: {DEMO_PASSWORD}"))
