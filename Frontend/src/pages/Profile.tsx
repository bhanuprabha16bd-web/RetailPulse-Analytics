import React from 'react';
import { Avatar, Box, Chip, Divider, Paper, Stack, Typography } from '@mui/material';
import { Business, Email, History, Person, Shield } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const ProfileField = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
    <Box sx={{ color: 'primary.main', display: 'flex' }}>{icon}</Box>
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 700 }}>
        {label}
      </Typography>
      <Typography>{value}</Typography>
    </Box>
  </Stack>
);

const Profile = () => {
  const { user } = useAuth();

  if (!user) return null;

  const lastLogin = user.last_login
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(user.last_login))
    : 'No recorded login';
  const isActive = user.status.toLowerCase() === 'active';

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <Typography variant="h4" sx={{ fontWeight: 'bold' }} gutterBottom>My Profile</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>Your account and company membership details.</Typography>

      <Paper sx={{ p: { xs: 3, sm: 4 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, mb: 4 }}>
          <Avatar sx={{ width: 72, height: 72, bgcolor: 'primary.main', fontSize: 30 }}>
            {user.name.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>{user.name}</Typography>
            <Typography color="text.secondary">{user.email}</Typography>
          </Box>
        </Stack>

        <Divider sx={{ mb: 3 }} />
        <Stack spacing={3}>
          <ProfileField icon={<Person />} label="Name" value={user.name} />
          <ProfileField icon={<Email />} label="Email" value={user.email} />
          <ProfileField icon={<Shield />} label="Role" value={user.role} />
          <ProfileField icon={<Business />} label="Company" value={user.company?.name ?? 'Company unavailable'} />
          <ProfileField icon={<History />} label="Last login" value={lastLogin} />
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Box sx={{ color: 'primary.main', display: 'flex' }}><Shield /></Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 700 }}>
                Account status
              </Typography>
              <Box><Chip label={user.status} color={isActive ? 'success' : 'default'} size="small" /></Box>
            </Box>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
};

export default Profile;
