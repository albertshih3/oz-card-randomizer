import { useEffect } from "react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    useDisclosure,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { SignInButton } from "@clerk/clerk-react";
import { Link } from "react-router-dom";

export default function Unauthorized() {
    const { isOpen, onOpen, onClose } = useDisclosure();

    const handleOpen = () => {
        onOpen();
    };

    useEffect(() => {
        handleOpen();
    }, []);

    return (
        <>
            <Modal backdrop='blur' isOpen={isOpen} onClose={onClose}>
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">Whoops!</ModalHeader>
                            <ModalBody>
                                <p>
                                    It seems as if you aren't logged in! In order to access this page you must be logged in to your account.
                                </p>
                            </ModalBody>
                            <ModalFooter>
                                <Button color="danger" variant="light" onPress={onClose}>
                                    <Link to="/">Go Back</Link>
                                </Button>
                                <Button color="success" onPress={onClose}>
                                    <SignInButton></SignInButton>
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </>
    );
}