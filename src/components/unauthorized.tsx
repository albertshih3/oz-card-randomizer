import { useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/modal";
import { M3Button } from "@/components/m3/button";
import { SignInButton } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";

export default function Unauthorized() {
  const navigate = useNavigate();
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    onOpen();
  }, [onOpen]);

  return (
    <>
      <Modal
        backdrop="blur"
        isOpen={isOpen}
        onClose={onClose}
        hideCloseButton
        isDismissable={false}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Whoops!</ModalHeader>
              <ModalBody>
                <p>
                  It seems as if you aren&apos;t logged in! In order to access
                  this page you must be logged in to your account.
                </p>
              </ModalBody>
              <ModalFooter>
                <M3Button
                  variant="text"
                  color="error"
                  onPress={() => {
                    onClose();
                    navigate("/");
                  }}
                >
                  Go Back
                </M3Button>
                <SignInButton>
                  <M3Button variant="filled">Sign In</M3Button>
                </SignInButton>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
