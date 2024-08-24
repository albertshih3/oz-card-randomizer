"use client"

import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
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
} from '@mui/material';

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

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Card Management
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Collection</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Number</TableCell>
              <TableCell>Active</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cards.map((card) => (
              <TableRow key={`${card.collection}-${card.id}`}>
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}