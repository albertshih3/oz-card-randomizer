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
} from "firebase/firestore";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import { useAuth } from "@clerk/nextjs"; // Clerk's useAuth hook
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
  TextField,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Box,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";

// Firebase Configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const collections = [
  { id: 'africansavanna', name: 'African Savannah' },
  { id: 'californiatrail', name: 'California Trail' },
  { id: 'childrenszoo', name: "Children's Zoo" },
  { id: 'tropicalrainforest', name: 'Tropical Rainforest' },
  { id: 'specialedition', name: 'Special Edition' },
  { id: 'booatthezoo', name: 'Boo at the Zoo' },
];

export default function CardManagement() {
  const { getToken } = useAuth(); // Clerk's getToken method
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [newCardName, setNewCardName] = useState("");
  const [newCardNumber, setNewCardNumber] = useState("");
  const [newCardActive, setNewCardActive] = useState(false);
  const [newCardCategory, setNewCardCategory] = useState("");

  useEffect(() => {
    const signIntoFirebaseWithClerk = async () => {
      const token = await getToken({ template: "integration_firebase" });
      await signInWithCustomToken(auth, token || "");
      fetchCards();
    };

    signIntoFirebaseWithClerk();
  }, [getToken]);

  const fetchCards = async () => {
    setLoading(true);
    const allCards: any[] = [];
    try {
      for (const collectionObj of collections) {
        const querySnapshot = await getDocs(collection(db, collectionObj.id));
        querySnapshot.forEach((doc) => {
          allCards.push({
            id: doc.id,
            collection: collectionObj.id,
            ...doc.data(),
          });
        });
      }
      setCards(allCards);
    } catch (err) {
      console.error("Error fetching cards:", err);
    }
    setLoading(false);
  };

  const toggleCardActive = async (card: any) => {
    const cardRef = doc(db, card.collection, card.id);
    const newActiveState = !card.active;
    try {
      await updateDoc(cardRef, { active: newActiveState });
      setCards((prevCards) =>
        prevCards.map((c) =>
          c.id === card.id ? { ...c, active: newActiveState } : c
        )
      );
    } catch (err) {
      console.error("Failed to toggle card active state:", err);
    }
  };

  const handleCreateCard = async () => {
    try {
      const newCard = {
        name: newCardName,
        number: newCardNumber,
        active: newCardActive,
        category: newCardCategory,
      };
      const docRef = await addDoc(collection(db, newCardCategory), newCard);
      setCards((prevCards) => [...prevCards, { id: docRef.id, collection: newCardCategory, ...newCard }]);
      setOpenDialog(false);
      setNewCardName("");
      setNewCardNumber("");
      setNewCardActive(false);
      setNewCardCategory("");
    } catch (err) {
      console.error("Error creating card:", err);
    }
  };

  if (loading) {
    return (
      <Container>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  return (
    <Container>
      <Typography variant="h4">Card Management</Typography>
      <Box display="flex" justifyContent="center" marginTop={2}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setOpenDialog(true)}
        >
          Create Card
        </Button>
      </Box>
      <TableContainer component={Paper} style={{ marginTop: "20px" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Number</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Active</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cards.map((card) => (
              <TableRow key={card.id}>
                <TableCell>{card.name}</TableCell>
                <TableCell>{card.number}</TableCell>
                <TableCell>{collections.find((c) => c.id === card.collection)?.name}</TableCell>
                <TableCell>
                  <Switch
                    checked={card.active}
                    onChange={() => toggleCardActive(card)}
                  />
                </TableCell>
                <TableCell>
                  <Button>Edit</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Create New Card</DialogTitle>
        <DialogContent>
          <TextField
            label="Card Name"
            value={newCardName}
            onChange={(e) => setNewCardName(e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Card Number"
            value={newCardNumber}
            onChange={(e) => setNewCardNumber(e.target.value)}
            fullWidth
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Category</InputLabel>
            <Select
              value={newCardCategory}
              onChange={(e) => setNewCardCategory(e.target.value)}
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
              checked={newCardActive}
              onChange={(e) => setNewCardActive(e.target.checked)}
            />
            <Typography>Active</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCreateCard}
            variant="contained"
            color="primary"
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
