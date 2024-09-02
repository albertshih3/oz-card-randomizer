"use client"

import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
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
  DialogContentText,
  DialogActions,
  Fab
} from '@mui/material';
import { getAnalytics, isSupported } from "firebase/analytics";
import AddIcon from '@mui/icons-material/Add';

// Initialize Firebase (replace with your config)
const firebaseConfig = {
    apiKey: "AIzaSyAtKLKB3-Nl0fP-9yeYd9SywiMXyAgtpLM",
    authDomain: "oz-card-randomizer.firebaseapp.com",
    projectId: "oz-card-randomizer",
    storageBucket: "oz-card-randomizer.appspot.com",
    messagingSenderId: "1060427616291",
    appId: "1:1060427616291:web:30e164d8a82a8d8899a196",
    measurementId: "G-D3P5Y0M38K"
  };

const app = initializeApp(firebaseConfig);
const analytics = isSupported().then(yes => yes ? getAnalytics(app) : null);
const db = getFirestore(app);

const collections = [
  { id: 'africansavanna', name: 'African Savannah' },
  { id: 'californiatrail', name: 'California Trail' },
  { id: 'childrenszoo', name: 'Children\'s Zoo' },
  { id: 'tropicalrainforest', name: 'Tropical Rainforest' },
  { id: 'specialedition', name: 'Special Edition' },
  { id: 'spoonbill', name: 'Spoonbill' },
];

export default function CardManagement() {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('collection');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [cardToEdit, setCardToEdit] = useState<any | null>(null);
  const [editedName, setEditedName] = useState('');
  const [editedNumber, setEditedNumber] = useState('');
  const [editedActive, setEditedActive] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newCardName, setNewCardName] = useState('');
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newCardCollection, setNewCardCollection] = useState(collections[0].id);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    setLoading(true);
    const allCards: any[] = [];
    for (const col of collections) {
      const querySnapshot = await getDocs(collection(db, col.id));
      querySnapshot.docs.forEach(doc => {
        allCards.push({
          id: doc.id,
          collection: col.id,
          collectionName: col.name,
          ...doc.data(),
          active: doc.data().active === undefined ? true : doc.data().active
        });
      });
    }
    setCards(allCards);
    setLoading(false);
  };

  const toggleCardActive = async (card: { collection: string; id: string; active: any; }) => {
    const cardRef = doc(db, card.collection, card.id);
    const newActiveState = !card.active;
    await updateDoc(cardRef, { active: newActiveState });
    setCards(cards.map(c => 
      c.id === card.id && c.collection === card.collection 
        ? { ...c, active: newActiveState } 
        : c
    ));
  };

  const handleSearchChange = (event: { target: { value: React.SetStateAction<string>; }; }) => {
    setSearchQuery(event.target.value);
  };

  const handleSortChange = (event: { target: { value: React.SetStateAction<string>; }; }) => {
    setSortBy(event.target.value);
  };

  const handleEditClick = (card: {
    collection: string;
    id: string;
    name: string;
    number: string | number;
    active: boolean;
  } | null) => {
    if (card) {
      setCardToEdit(card);
      setEditedName(card.name);
      setEditedNumber(card.number.toString());
      setEditedActive(card.active);
      setEditDialogOpen(true);
    }
  };

  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
    setCardToEdit(null);
  };

  const handleEditSave = async () => {
    if (cardToEdit) {
      const cardRef = doc(db, cardToEdit.collection, cardToEdit.id);
      await updateDoc(cardRef, { 
        name: editedName, 
        number: editedNumber,
        active: editedActive
      });

      setCards(cards.map(c => 
        c.id === cardToEdit.id && c.collection === cardToEdit.collection 
          ? { ...c, name: editedName, number: editedNumber, active: editedActive } 
          : c
      ));
    }
    handleEditDialogClose();
  };

  const handleDeleteCard = async () => {
    if (cardToEdit) {
      const cardRef = doc(db, cardToEdit.collection, cardToEdit.id);
      await deleteDoc(cardRef);
      setCards(cards.filter(c => c.id !== cardToEdit.id || c.collection !== cardToEdit.collection));
    }
    handleEditDialogClose();
  };

  const handleAddCardClick = () => {
    setAddDialogOpen(true);
  };

  const handleAddDialogClose = () => {
    setAddDialogOpen(false);
    setNewCardName('');
    setNewCardNumber('');
  };

  const handleAddCardSave = async () => {
    const newCard = {
      name: newCardName,
      number: newCardNumber,
      active: true // Default to active
    };
    const docRef = await addDoc(collection(db, newCardCollection), newCard);
    setNewCardName('');
    setNewCardNumber('');
    setNewCardCollection(collections[0].id);
    setAddDialogOpen(false);
    // Fetch the newly added card
    fetchCards();
  };

  const filteredCards = cards.filter((card) =>
    card.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.collectionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.number.toString().includes(searchQuery)
  );

  const sortedCards = filteredCards.sort((a, b) => {
    if (sortBy === 'number') {
      return a.number - b.number;
    } else if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    } else { // sortBy === 'collection'
      return a.collectionName.localeCompare(b.collectionName);
    }
  });

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Card Management
      </Typography>

      <TextField
        label="Search"
        value={searchQuery}
        onChange={handleSearchChange}
        sx={{ mb: 2, width: '88%', mr: 2 }}
      />

      <FormControl sx={{ mb: 2, minWidth: 120 }}>
        <InputLabel id="sort-by-label">Sort By</InputLabel>
        <Select
          labelId="sort-by-label"
          id="sort-by"
          value={sortBy}
          label="Sort By"
          onChange={handleSortChange}
        >
          <MenuItem value="collection">Collection</MenuItem>
          <MenuItem value="number">Number</MenuItem>
          <MenuItem value="name">Name</MenuItem>
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
              <TableRow key={`<span class="math-inline">\{card\.collection\}\-</span>{card.id}`}>
                <TableCell>{card.collectionName}</TableCell>
                <TableCell>{card.name}</TableCell>
                <TableCell>{card.number}</TableCell>
                <TableCell>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={card.active}
                        onChange={() => toggleCardActive(card)}
                        color="primary"
                      />
                    }
                    label={card.active ? 'Active' : 'Inactive'}
                  />
                </TableCell>
                <TableCell>
                  <Button variant="outlined" onClick={() => handleEditClick(card)}>
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Fab color="primary" aria-label="add" onClick={handleAddCardClick} sx={{ position: 'fixed', bottom: 24, right: 24 }}>
        <AddIcon />
      </Fab>

      <Dialog open={editDialogOpen} onClose={handleEditDialogClose}>
        <DialogTitle>Edit Card</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="Name"
            type="text"
            fullWidth
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
          />
          <TextField
            margin="dense"
            id="number"
            label="Number"
            type="number"
            fullWidth
            value={editedNumber}
            onChange={(e) => setEditedNumber(e.target.value)}
          />
          <FormControlLabel
            control={
              <Switch
                checked={editedActive}
                onChange={(e) => setEditedActive(e.target.checked)}
                color="primary"
              />
            }
            label={editedActive ? 'Active' : 'Inactive'}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditDialogClose}>Cancel</Button>
          <Button onClick={handleEditSave}>Save</Button>
          <Button onClick={handleDeleteCard} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={addDialogOpen} onClose={handleAddDialogClose}>
        <DialogTitle>Add New Card</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="Name"
            type="text"
            fullWidth
            value={newCardName}
            onChange={(e) => setNewCardName(e.target.value)}
          />
          <TextField
            margin="dense"
            id="number"
            label="Number"
            type="number"
            fullWidth
            value={newCardNumber}
            onChange={(e) => setNewCardNumber(e.target.value)}
          />
          <FormControl sx={{ mb: 2, minWidth: 120 }}>
            <InputLabel id="collection-label">Collection</InputLabel>
            <Select
              labelId="collection-label"
              id="collection"
              value={newCardCollection}
              label="Collection"
              onChange={(e) => setNewCardCollection(e.target.value)}
            >
              {collections.map(col => (
                <MenuItem key={col.id} value={col.id}>{col.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAddDialogClose}>Cancel</Button>
          <Button onClick={handleAddCardSave}>Save</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}