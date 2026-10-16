import React, { useState, useEffect } from 'react';
import {
  Drawer, Box, Typography, IconButton, Divider, Chip, Button,
  CircularProgress, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, List, ListItem, ListItemText, ListItemAvatar, Avatar, Paper,
  Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PersonIcon from '@mui/icons-material/Person';

import { workflowApi, WorkflowRequest } from '../../api/workflowApi';

interface RequestDetailDrawerProps {
  requestId: string | null;   // REQ-XXXX string
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

const getStatusChip = (status: string) => {
  if (status === 'Pending Approval') return <Chip size="small" label="Pending Approval" sx={{ bgcolor: '#ff9800', color: 'white' }} />;
  if (status === 'Approved') return <Chip size="small" label="Approved" color="success" />;
  if (status === 'Rejected') return <Chip size="small" label="Rejected" color="error" />;
  if (status === 'Cancelled') return <Chip size="small" label="Cancelled" color="default" />;
  return <Chip size="small" label={status} color="info" />;
};

const getPriorityChip = (priority: string) => {
  const color = ['High', 'Critical'].includes(priority) ? 'error' : priority === 'Medium' ? 'warning' : 'success';
  return <Chip size="small" label={priority} color={color as any} />;
};

const formatDate = (dt?: string) => {
  if (!dt) return '-';
  return new Date(dt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

const ChangeDetails: React.FC<{ request: WorkflowRequest }> = ({ request }) => {
  const cv = request.currentValues || {};
  const rv = request.requestedValues || {};

  if (request.requestType === 'Product Price Change') {
    const oldPrice = cv.price ?? '-';
    const newPrice = rv.price ?? '-';
    const diff = typeof oldPrice === 'number' && typeof newPrice === 'number' ? newPrice - oldPrice : null;
    return (
      <Box>
        <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
          <Paper variant="outlined" sx={{ flex: 1, p: 1.5, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">Current Price</Typography>
            <Typography variant="h6" sx={{ textDecoration: 'line-through', color: 'text.secondary' }}>
              ₹{oldPrice.toLocaleString?.() ?? oldPrice}
            </Typography>
          </Paper>
          <Paper variant="outlined" sx={{ flex: 1, p: 1.5, textAlign: 'center', bgcolor: '#e8f5e9' }}>
            <Typography variant="caption" color="text.secondary">Requested Price</Typography>
            <Typography variant="h6" sx={{ color: 'success.main', fontWeight: 'bold' }}>
              ₹{newPrice.toLocaleString?.() ?? newPrice}
            </Typography>
          </Paper>
        </Box>
        {diff !== null && (
          <Typography variant="body2" sx={{ color: diff < 0 ? 'error.main' : 'success.main', fontWeight: 'bold' }}>
            Difference: {diff > 0 ? '+' : ''}₹{Math.abs(diff).toLocaleString()}
          </Typography>
        )}
      </Box>
    );
  }

  if (request.requestType === 'Stock Adjustment') {
    const oldStock = cv.stock ?? '-';
    const newStock = rv.stock ?? '-';
    const diff = typeof oldStock === 'number' && typeof newStock === 'number' ? newStock - oldStock : null;
    return (
      <Box>
        <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
          <Paper variant="outlined" sx={{ flex: 1, p: 1.5, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">Current Stock</Typography>
            <Typography variant="h6">{oldStock}</Typography>
          </Paper>
          <Paper variant="outlined" sx={{ flex: 1, p: 1.5, textAlign: 'center', bgcolor: '#e8f5e9' }}>
            <Typography variant="caption" color="text.secondary">Requested Stock</Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>{newStock}</Typography>
          </Paper>
        </Box>
        {diff !== null && (
          <Typography variant="body2" sx={{ color: diff < 0 ? 'error.main' : 'success.main', fontWeight: 'bold' }}>
            Difference: {diff > 0 ? '+' : ''}{diff}
          </Typography>
        )}
      </Box>
    );
  }

  if (request.requestType === 'Product Deactivation') {
    return (
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Current Status</Typography>
          <Chip label="Active" color="success" size="small" />
        </Box>
        <Typography>→</Typography>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Requested Status</Typography>
          <Chip label="Inactive" color="error" size="small" />
        </Box>
      </Box>
    );
  }

  // Generic key-value display
  const allKeys = Array.from(new Set([...Object.keys(cv), ...Object.keys(rv)]));
  if (allKeys.length === 0) return null;
  return (
    <Box>
      {allKeys.map(key => (
        <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
            {key.replace(/([A-Z])/g, ' $1').trim()}:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {cv[key] !== undefined && (
              <Typography variant="body2" sx={{ textDecoration: rv[key] !== undefined ? 'line-through' : 'none', color: 'text.secondary' }}>
                {String(cv[key])}
              </Typography>
            )}
            {rv[key] !== undefined && (
              <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                {String(rv[key])}
              </Typography>
            )}
          </Box>
        </Box>
      ))}
    </Box>
  );
};

const RequestDetailDrawer: React.FC<RequestDetailDrawerProps> = ({ requestId, open, onClose, onUpdated }) => {
  const [request, setRequest] = useState<WorkflowRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchRequest = async () => {
    if (!requestId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await workflowApi.getRequest(requestId);
      setRequest(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load request');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && requestId) {
      fetchRequest();
    } else {
      setRequest(null);
      setCommentText('');
      setError(null);
    }
  }, [open, requestId]);

  const handleApprove = async () => {
    if (!request) return;
    setActionLoading(true);
    setError(null);
    try {
      await workflowApi.approveRequest(request.requestId, commentText || undefined);
      setCommentText('');
      onUpdated();
      fetchRequest();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to approve request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!request || !rejectReason.trim()) return;
    setActionLoading(true);
    setError(null);
    try {
      await workflowApi.rejectRequest(request.requestId, rejectReason, commentText || undefined);
      setRejectDialogOpen(false);
      setRejectReason('');
      setCommentText('');
      onUpdated();
      fetchRequest();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to reject request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!request) return;
    setActionLoading(true);
    try {
      await workflowApi.cancelRequest(request.requestId);
      onUpdated();
      fetchRequest();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to cancel request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!request || !commentText.trim()) return;
    try {
      await workflowApi.addComment(request.requestId, commentText);
      setCommentText('');
      fetchRequest();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to add comment');
    }
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        slotProps={{ paper: { sx: { width: { xs: '100%', sm: 500 } } } }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : request ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* ── Header ── */}
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                  {request.requestId}
                </Typography>
                <Chip size="small" label={request.requestType} variant="outlined" color="primary" />
              </Box>
              <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
            </Box>

            {/* ── Scrollable Body ── */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

              {/* Meta info */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>
                      {request.requesterName?.charAt(0) || <PersonIcon fontSize="small" />}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{request.requesterName || 'Unknown'}</Typography>
                      <Typography variant="caption" color="text.secondary">{request.requesterEmail}</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary">Created at</Typography>
                    <Typography variant="body2">{formatDate(request.createdAt)}</Typography>
                  </Box>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Status</Typography>
                    <Box>{getStatusChip(request.status)}</Box>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Priority</Typography>
                    <Box>{getPriorityChip(request.priority)}</Box>
                  </Box>
                  {request.relatedRecordLabel && (
                    <Box sx={{ gridColumn: '1 / -1' }}>
                      <Typography variant="caption" color="text.secondary">Related Record</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{request.relatedRecordLabel}</Typography>
                    </Box>
                  )}
                </Box>
              </Paper>

              {/* Change Details */}
              {(request.currentValues || request.requestedValues) && (
                <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#f0f7ff' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1.5 }}>Change Details</Typography>
                  <ChangeDetails request={request} />
                </Paper>
              )}

              {/* Reason */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>Reason</Typography>
                <Typography variant="body2" color="text.secondary">{request.reason}</Typography>
                {request.rejectionReason && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    <Typography variant="body2"><strong>Rejection Reason:</strong> {request.rejectionReason}</Typography>
                  </Alert>
                )}
                {request.status === 'Approved' && request.reviewerName && (
                  <Alert severity="success" sx={{ mt: 1 }}>
                    Approved by <strong>{request.reviewerName}</strong> on {formatDate(request.reviewedAt)}
                  </Alert>
                )}
              </Paper>

              {/* Approval History */}
              {request.history && request.history.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Approval History</Typography>
                  {request.history.map((h, idx) => (
                    <Box key={h.id} sx={{ display: 'flex', gap: 1.5, mb: idx < request.history.length - 1 ? 1.5 : 0 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Box sx={{
                          width: 10, height: 10, borderRadius: '50%', mt: 0.5, flexShrink: 0,
                          bgcolor: h.action === 'Approved' ? 'success.main' : h.action === 'Rejected' ? 'error.main' : 'primary.main'
                        }} />
                        {idx < request.history.length - 1 && (
                          <Box sx={{ width: 2, flex: 1, bgcolor: 'divider', my: 0.5 }} />
                        )}
                      </Box>
                      <Box sx={{ flex: 1, pb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{h.action}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          by {h.performerName || 'System'} · {formatDate(h.createdAt)}
                        </Typography>
                        {h.note && <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>{h.note}</Typography>}
                      </Box>
                    </Box>
                  ))}
                </Paper>
              )}

              {/* Comments */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Comments</Typography>
                {request.comments && request.comments.length > 0 ? (
                  <List disablePadding>
                    {request.comments.map(c => (
                      <ListItem key={c.id} disableGutters alignItems="flex-start" sx={{ mb: 1 }}>
                        <ListItemAvatar sx={{ minWidth: 36 }}>
                          <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: 'secondary.main' }}>
                            {c.authorName?.charAt(0) || '?'}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="caption" sx={{ fontWeight: 'bold' }}>{c.authorName}</Typography>
                              <Typography variant="caption" color="text.secondary">{formatDate(c.createdAt)}</Typography>
                            </Box>
                          }
                          secondary={
                            <Paper variant="outlined" sx={{ p: 1, mt: 0.5 }}>
                              <Typography variant="body2">{c.comment}</Typography>
                            </Paper>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary">No comments yet</Typography>
                )}

                {/* Add Comment */}
                <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    multiline
                    maxRows={3}
                  />
                  <Button
                    variant="contained"
                    disabled={!commentText.trim()}
                    onClick={handleAddComment}
                    sx={{ minWidth: 44 }}
                  >
                    <SendIcon fontSize="small" />
                  </Button>
                </Box>
              </Paper>
            </Box>

            {/* ── Fixed Action Bar ── */}
            <Box sx={{ borderTop: 1, borderColor: 'divider', p: 2, flexShrink: 0 }}>
              {request.status === 'Pending Approval' ? (
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircleIcon />}
                    onClick={handleApprove}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Processing...' : 'Approve'}
                  </Button>
                  <Button
                    fullWidth
                    variant="contained"
                    color="error"
                    startIcon={<CancelIcon />}
                    onClick={() => setRejectDialogOpen(true)}
                    disabled={actionLoading}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="outlined"
                    color="inherit"
                    onClick={handleCancel}
                    disabled={actionLoading}
                    sx={{ minWidth: 90 }}
                  >
                    Cancel
                  </Button>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  {getStatusChip(request.status)}
                </Box>
              )}
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: 2 }}>
            {error ? <Alert severity="error">{error}</Alert> : <Typography color="text.secondary">No request selected</Typography>}
          </Box>
        )}
      </Drawer>

      {/* Reject Confirmation Dialog */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Request</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Please provide a reason for rejecting this request. This will be visible to the requester.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            label="Rejection Reason *"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleReject}
            color="error"
            variant="contained"
            disabled={!rejectReason.trim() || actionLoading}
          >
            {actionLoading ? 'Rejecting...' : 'Confirm Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RequestDetailDrawer;
