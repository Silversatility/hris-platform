from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsStaffOrReadOnly

from .models import SiteSettings
from .serializers import SiteSettingsSerializer


class SiteSettingsView(APIView):
    permission_classes = [IsStaffOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        serializer = SiteSettingsSerializer(SiteSettings.load(), context={"request": request})
        return Response(serializer.data)

    def patch(self, request):
        instance = SiteSettings.load()
        serializer = SiteSettingsSerializer(
            instance, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request):
        instance = SiteSettings.load()
        instance.logo.delete(save=False)
        instance.logo = None
        instance.save()
        serializer = SiteSettingsSerializer(instance, context={"request": request})
        return Response(serializer.data)
