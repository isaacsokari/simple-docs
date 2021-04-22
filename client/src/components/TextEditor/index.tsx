import React, { useCallback, useEffect, useState } from 'react';
import Quill, { TextChangeHandler } from 'quill';
import io from 'socket.io-client';

import 'quill/dist/quill.snow.css';
import { useParams } from 'react-router';

const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: [] }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['bold', 'italic', 'underline'],
  [{ color: {} }, { background: {} }],
  [{ script: 'sub' }, { script: 'super' }],
  [{ align: [] }],
  ['image', 'blockquote', 'code-block'],
  ['clean'],
];

const TextEditor = () => {
  // TODO: check this type later
  const [socket, setSocket] = useState<any>();
  const [quill, setQuill] = useState<Quill>();
  const { documentId }: { documentId: string } = useParams();
  const SAVE_INTERVAL_MS: number = 2000;

  /* Connect to Socket.io server */
  useEffect(() => {
    // const s = io(`http://localhost:4000`);
    const s = io(`/`);
    setSocket(s);

    return () => {
      s?.disconnect();
    };
  }, []);

  /* Create rooms for documents with same id */
  useEffect(() => {
    if (socket == null || quill == null) return;

    // change any type
    socket.once('load-document', (document: any) => {
      quill.setContents(document);
      quill.enable(true);
    });

    socket.emit('get-document', documentId);
  }, [socket, quill, documentId]);

  // TODO: sort out this type later
  /* Send Changes on Text Input */
  useEffect((): any => {
    if (socket == null || quill == null) return;

    const handler: TextChangeHandler = (delta, oldDelta, source) => {
      if (source !== 'user') return;
      socket.emit('send-changes', delta);
    };

    quill?.on('text-change', handler);

    return () => {
      quill?.off('text-change', handler);
    };
  }, [socket, quill]);

  // TODO: sort out this type later
  /* Receive changes and update from server */
  useEffect((): any => {
    if (socket == null || quill == null) return;

    const handler: TextChangeHandler = (delta) => {
      quill.updateContents(delta);
    };

    socket.on('receive-changes', handler);

    return () => {
      socket.off('receive-changes', handler);
    };
  }, [socket, quill]);

  /* Save document to database */
  useEffect(() => {
    if (socket == null || quill == null) return;

    const interval = setInterval(() => {
      socket.emit('save-document', quill.getContents());
    }, SAVE_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [socket, quill]);

  const wrapperRef = useCallback((wrapper) => {
    if (wrapper == null) return;

    wrapper.innerHTML = '';

    const editor = document.createElement('div');
    wrapper.append(editor);

    const q = new Quill(editor, {
      theme: 'snow',
      modules: { toolbar: TOOLBAR_OPTIONS },
    });

    q.disable();
    q.setText('Loading Document...');
    setQuill(q);
  }, []);

  return <div className="container" ref={wrapperRef}></div>;
};

export default TextEditor;
