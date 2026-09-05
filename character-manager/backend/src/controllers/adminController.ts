import type { Request, Response } from 'express';
import { canAdministerApp, type AppRole } from '../auth/permissions';
import { appViewer } from '../auth/viewer';
import { getStore } from '../db';

function requireAppAdmin(req: Request, res: Response): boolean {
  if (!canAdministerApp(appViewer(req))) {
    res.status(403).json({ message: 'App administrators only.' });
    return false;
  }
  return true;
}

export async function listUsers(req: Request, res: Response) {
  if (!requireAppAdmin(req, res)) return;
  res.json(await getStore().listUsers());
}

export async function setAppRole(req: Request, res: Response) {
  if (!requireAppAdmin(req, res)) return;

  const role = req.body?.role as AppRole;
  if (role !== 'admin' && role !== 'user') {
    return res.status(400).json({ message: 'Role must be "admin" or "user".' });
  }

  // Removing your own admin rights could leave the app with no administrator
  // and no way back short of a database edit.
  if (req.params.id === req.user!.id && role === 'user') {
    const admins = (await getStore().listUsers()).filter((u) => u.appRole === 'admin');
    if (admins.length <= 1) {
      return res
        .status(409)
        .json({ message: 'The last app administrator cannot be demoted.' });
    }
  }

  if (!(await getStore().setAppRole(req.params.id, role))) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json(await getStore().listUsers());
}
