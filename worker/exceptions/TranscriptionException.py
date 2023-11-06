class TranscriptionException(Exception):
    """
    This Exception will be raised if the program crashes while working on the
    job
    """

    def __init__(self, job, channel, method):
        self.jobName = job
        self.channel = channel
        self.method = method
        message = "Job Transcription failed"
        super().__init__(message)
