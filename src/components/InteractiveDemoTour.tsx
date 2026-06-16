import React, { useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

interface InteractiveDemoTourProps {
  run: boolean;
  onFinish: () => void;
}

export default function InteractiveDemoTour({ run, onFinish }: InteractiveDemoTourProps) {
  const [{ steps }] = useState<{ steps: Step[] }>({
    steps: [
      {
        target: 'body',
        content: 'Welcome to DevOS! Let\'s take a quick tour of your new workspace.',
        placement: 'center',
        
      },
      {
        target: '#tour-explorer',
        content: 'This is the File Explorer. Here you can create, rename, and organize your project files.',
        placement: 'right',
      },
      {
        target: '#tour-editor',
        content: 'The Editor is where the magic happens. We support syntax highlighting, auto-completion, and real-time collaboration.',
        placement: 'bottom',
      },
      {
        target: '#tour-terminal',
        content: 'A full-featured terminal. Run your build scripts, install packages, and execute commands directly in the cloud.',
        placement: 'top',
      },
      {
        target: '#tour-preview',
        content: 'Live Preview! See your web applications update instantly as you type.',
        placement: 'left',
      },
      {
        target: '#tour-deploy',
        content: 'Ready to share your work? One-click deployments make it easy to publish your projects to the world.',
        placement: 'bottom',
      }
    ]
  });

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      onFinish();
    }
  };

  return (
    <Joyride
      callback={handleJoyrideCallback}
      continuous
      hideCloseButton
      run={run}
      scrollToFirstStep
      showProgress
      showSkipButton
      steps={steps}
      styles={{
        options: {
          zIndex: 10000,
          primaryColor: '#3b82f6',
          backgroundColor: '#1e1e20',
          textColor: '#ffffff',
          arrowColor: '#1e1e20',
        },
        buttonClose: {
          display: 'none',
        },
        buttonSkip: {
          color: '#9ca3af',
        },
        buttonBack: {
          color: '#9ca3af',
        },
        tooltipContainer: {
          textAlign: 'left' as const,
        },
        tooltip: {
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.1)',
        }
      }}
    />
  );
}
