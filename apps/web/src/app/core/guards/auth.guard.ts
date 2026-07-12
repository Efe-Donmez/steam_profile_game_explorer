import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// /sync, /profile and /app all call JwtAuthGuard-protected endpoints; without
// this guard, a logged-out user landing on one of those routes directly
// (bookmark, refresh, expired cookie) would trigger 401s the components
// don't handle gracefully instead of being sent back to log in.
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const user = auth.user() ?? (await auth.fetchMe());
  if (user) {
    return true;
  }
  return router.parseUrl('/');
};
