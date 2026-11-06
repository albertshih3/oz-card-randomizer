const auth = {
  currentUser: null as { uid: string } | null,
};

export const getAuth = () => auth;
export const signInWithCustomToken = async () => {
  auth.currentUser = { uid: "user_e2e" };
  return { user: auth.currentUser };
};
export const signOut = async () => {
  auth.currentUser = null;
};
export const onAuthStateChanged = (
  _auth: unknown,
  callback: (user: unknown) => void,
) => {
  callback(auth.currentUser);
  return () => {};
};
