import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Typography, TextField, Button, Paper, Container, Grid, Alert, CircularProgress, MenuItem } from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import { axiosInstance } from '../api/axios';

const registerSchema = z.object({
  name: z.string().min(2, "Company Name must be at least 2 characters"),
  industry: z.string().min(2, "Industry is required"),
  email: z.string().email("Invalid company email"),
  address: z.string().min(5, "Address is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  owner_name: z.string().min(2, "Owner Name is required"),
  owner_email: z.string().email("Invalid owner email"),
  owner_role: z.enum(["Super Admin", "Company Admin", "Analyst", "Viewer"]),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirm_password: z.string().min(8, "Confirm Password is required")
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const Register = () => {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { owner_role: "Company Admin" },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      setServerError(null);
      await axiosInstance.post('/auth/register', data);
      navigate('/login', { state: { message: "Registration successful. Please login." } });
    } catch (error: any) {
      setServerError(error.response?.data?.detail || "Registration failed. Please try again.");
    }
  };

  return (
    <Container component="main" maxWidth="md" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: 4 }}>
      <Paper elevation={24} sx={{ p: 5, width: '100%', borderRadius: 3 }}>
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h3" color="primary" gutterBottom sx={{ fontWeight: 'bold' }}>
            RetailPulse Analytics
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Register your company and start gaining insights today.
          </Typography>
        </Box>

        {serverError && <Alert severity="error" sx={{ mb: 3 }}>{serverError}</Alert>}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" color="primary.light">Company Information</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Company Name" {...register('name')} error={!!errors.name} helperText={errors.name?.message} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Industry" {...register('industry')} error={!!errors.industry} helperText={errors.industry?.message} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Company Email" type="email" {...register('email')} error={!!errors.email} helperText={errors.email?.message} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Phone Number" {...register('phone')} error={!!errors.phone} helperText={errors.phone?.message} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Address" {...register('address')} error={!!errors.address} helperText={errors.address?.message} />
            </Grid>

            <Grid item xs={12} sx={{ mt: 2 }}>
              <Typography variant="h6" color="primary.light">Owner Account</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Owner Name" {...register('owner_name')} error={!!errors.owner_name} helperText={errors.owner_name?.message} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Owner Email" type="email" {...register('owner_email')} error={!!errors.owner_email} helperText={errors.owner_email?.message} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Owner Role"
                {...register('owner_role')}
                error={!!errors.owner_role}
                helperText={errors.owner_role?.message || 'Controls the access granted to this account.'}
              >
                <MenuItem value="Super Admin">Super Admin</MenuItem>
                <MenuItem value="Company Admin">Company Admin</MenuItem>
                <MenuItem value="Analyst">Analyst</MenuItem>
                <MenuItem value="Viewer">Viewer</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Password" type="password" {...register('password')} error={!!errors.password} helperText={errors.password?.message} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Confirm Password" type="password" {...register('confirm_password')} error={!!errors.confirm_password} helperText={errors.confirm_password?.message} />
            </Grid>
          </Grid>

          <Box sx={{ mt: 5, textAlign: 'center' }}>
            <Button type="submit" variant="contained" size="large" disabled={isSubmitting} sx={{ minWidth: 200 }}>
              {isSubmitting ? <CircularProgress size={24} /> : 'Register Company'}
            </Button>
            <Typography variant="body2" sx={{ mt: 3, color: 'text.secondary' }}>
              Already have an account? <Link to="/login" style={{ color: '#a78bfa', textDecoration: 'none' }}>Log in here</Link>
            </Typography>
          </Box>
        </form>
      </Paper>
    </Container>
  );
};

export default Register;
