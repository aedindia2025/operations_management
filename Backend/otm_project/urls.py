from django.contrib import admin
from django.urls import path, include
from master.viewsets.auth import LoginView, CurrentUserView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/login/', LoginView.as_view(), name='auth-login'),
    path('api/auth/me/', CurrentUserView.as_view(), name='auth-me'),
    path('api/master/', include('master.urls')),
]
