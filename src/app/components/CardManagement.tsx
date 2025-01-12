import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Switch,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
} from "@mui/material";

const collections = [
  { id: "africansavanna", name: "African Savannah" },
  { id: "californiatrail", name: "California Trail" },
  { id: "childrenszoo", name: "Children's Zoo" },
  { id: "tropicalrainforest", name: "Tropical Rainforest" },
  { id: "specialedition", name: "Special Edition" },
  { id: "booatthezoo", name: "Boo at the Zoo" },
  { id: "arcas", name: "ARCAS" },
  { id: "newnaturefoundation", name: "New Nature Foundation" },
  { id: "disney", name: "Disney" },
];


interface CardDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (card: { name: string; number: string; active: boolean; category: string }) => void;
  onDelete?: (card: { name: string; number: string; active: boolean; category: string }) => void;
  editingCard?: { name: string; number: string; active: boolean; collection: string };
}

export default function CardDialog({
  open,
  onClose,
  onSave,
  onDelete, // New prop for delete action
  editingCard,
}: CardDialogProps) {
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [active, setActive] = useState(false);
  const [category, setCategory] = useState("");

  useEffect(() => {
    if (editingCard) {
      setName(editingCard.name || "");
      setNumber(editingCard.number || "");
      setActive(editingCard.active || false);
      setCategory(editingCard.collection || "");
    } else {
      setName("");
      setNumber("");
      setActive(false);
      setCategory("");
    }
  }, [editingCard]);

  const handleSave = () => {
    onSave({ name, number, active, category });
  };

  const handleDelete = () => {
    if (editingCard && onDelete) {
      onDelete({ ...editingCard, category: editingCard.collection });
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{editingCard ? "Edit Card" : "Create Card"}</DialogTitle>
      <DialogContent>
        <TextField
          label="Card Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Card Number"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          fullWidth
          margin="normal"
        />
        <FormControl fullWidth margin="normal">
          <InputLabel>Category</InputLabel>
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {collections.map((collection) => (
              <MenuItem key={collection.id} value={collection.id}>
                {collection.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box display="flex" alignItems="center" marginTop={2}>
          <Switch
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          <Typography>Active</Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        {editingCard && (
          <Button
            onClick={handleDelete}
            variant="outlined"
            color="secondary"
            style={{ marginRight: "auto" }}
          >
            Delete Card
          </Button>
        )}
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          {editingCard ? "Save Changes" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
