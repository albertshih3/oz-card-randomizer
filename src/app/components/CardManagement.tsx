"use client";

import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Switch,
  FormControlLabel,
  CircularProgress,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAtKLKB3-Nl0fP-9yeYd9SywiMXyAgtpLM",
  authDomain: "oz-card-randomizer.firebaseapp.com",
  projectId: "oz-card-randomizer",
  storageBucket: "oz-card-randomizer.appspot.com",
  messagingSenderId: "1060427616291",
  appId: "1:1060427616291:web:30e164d8a82a8d8899a196",
  measurementId: "G-D3P5Y0M38K",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const collections = [
  { id: "africansavanna", name: "African Savannah" },
  { id: "californiatrail", name: "California Trail" },
  { id: "childrenszoo", name: "Children's Zoo" },
  { id: "tropicalrainforest", name: "Tropical Rainforest" },
  { id: "specialedition", name: "Special Edition" },
  { id: "spoonbill", name: "Spoonbill" },
  { id: "booatthezoo", name: "Boo At The Zoo" },
];

export default function CardManagement() {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("collection");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [cardToEdit, setCardToEdit] = useState<any | null>(null);
  const [editedName, setEditedName] = useState("");
  const [editedNumber, setEditedNumber] = useState("");
  const [editedActive, setEditedActive] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newCardName, setNewCardName] = useState("");
  const [newCardNumber, setNewCardNumber] = useState("");
  const [newCardCollection, setNewCardCollection] = useState(
    collections[0].id
  );

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    setLoading(true);
    const allCards: any[] = [];
    for (const col of collections) {
      const querySnapshot = await getDocs(collection(db, col.id));
      querySnapshot.docs.forEach((doc) => {
        allCards.push({
          id: doc.id,
          collection: col.id,
          collectionName: col.name,
          ...doc.data(),
          active: doc.data().active === undefined ? true : doc.data().active,
        });
      });
    }
    setCards(allCards);
    setLoading(false);
  };

  const toggleCardActive = async (card: { collection: string; id: string; active: any }) => {
    const cardRef = doc(db, card.collection, card.id);
    const newActiveState = !card.active;
    await updateDoc(cardRef, { active: newActiveState });
    setCards((prevCards) =>
      prevCards.map((c) =>
        c.id === card.id && c.collection === card.collection
          ? { ...c, active: newActiveState }
          : c
      )
    );
  };

  const handleEditClick = (card: any) => {
    setCardToEdit(card);
    setEditedName(card.name);
    setEditedNumber(card.number.toString());
    setEditedActive(card.active);
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (cardToEdit) {
      const cardRef = doc(db, cardToEdit.collection, cardToEdit.id);
      await updateDoc(cardRef, {
        name: editedName,
        number: editedNumber,
        active: editedActive,
      });

      setCards((prevCards) =>
        prevCards.map((c) =>
          c.id === cardToEdit.id && c.collection === cardToEdit.collection
            ? { ...c, name: editedName, number: editedNumber, active: editedActive }
            : c
        )
      );
    }
    setEditDialogOpen(false);
  };

  const handleAddCardSave = async () => {
    const newCard = {
      name: newCardName,
      number: newCardNumber,
      active: true,
    };
    await addDoc(collection(db, newCardCollection), newCard);
    setNewCardName("");
    setNewCardNumber("");
    setNewCardCollection(collections[0].id);
    setAddDialogOpen(false);
    fetchCards();
  };

  const filteredCards = cards.filter((card) =>
    card.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.collectionName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedCards = filteredCards.sort((a, b) => {
    if (sortBy === "number") {
      return a.number - b.number;
    } else if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    } else {
      return a.collectionName.localeCompare(b.collectionName);
    }
  });

  if (loading) {
    return (
      <Container sx={{ display: "flex", justifyContent: "center", height: "100vh" }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Card Management
      </Typography>
      <TextField
        label="Search"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
      />
      <FormControl sx={{ mb: 2, minWidth: 120 }}>
        <InputLabel>Sort By</InputLabel>
        <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <MenuItem value="collection">Collection</MenuItem>
          <MenuItem value="name">Name</MenuItem>
          <MenuItem value="number">Number</MenuItem>
        </Select>
      </FormControl>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Collection</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Number</TableCell>
              <TableCell>Active</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedCards.map((card) => (
              <TableRow key={`${card.collection}-${card.id}`}>
                <TableCell>{card.collectionName}</TableCell>
                <TableCell>{card.name}</TableCell>
                <TableCell>{card.number}</TableCell>
                <TableCell>
                  <Switch
                    checked={card.active}
                    onChange={() => toggleCardActive(card)}
                  />
                </TableCell>
                <TableCell>
                  <Button onClick={() => handleEditClick(card)}>Edit</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Fab onClick={() => setAddDialogOpen(true)} color="primary" sx={{ mt: 2 }}>
        <AddIcon />
      </Fab>
      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)}>
        <DialogTitle>Add New Card</DialogTitle>
        <DialogContent>
          <TextField
            label="Name"
            value={newCardName}
            onChange={(e) => setNewCardName(e.target.value)}
            fullWidth
          />
          <TextField
            label="Number"
            value={newCardNumber}
            onChange={(e) => setNewCardNumber(e.target.value)}
            fullWidth
            sx={{ mt: 2 }}
          />
          <FormControl sx={{ mt: 2, minWidth: 120 }}>
            <InputLabel>Collection</InputLabel>
            <Select
              value={newCardCollection}
              onChange={(e) => setNewCardCollection(e.target.value)}
            >
              {collections.map((col) => (
                <MenuItem key={col.id} value={col.id}>
                  {col.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddCardSave}>Save</Button>
        </DialogActions>
      </Dialog>
      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Edit Card</DialogTitle>
        <DialogContent>
          <TextField
            label="Name"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            fullWidth
          />
          <TextField
            label="Number"
            value={editedNumber}
            onChange={(e) => setEditedNumber(e.target.value)}
            fullWidth
            sx={{ mt: 2 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={editedActive}
                onChange={(e) => setEditedActive(e.target.checked)}
              />
            }
            label="Active"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditSave}>Save</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
