class TranscriptionException(Exception):
    """
    This Exception will be raised if the program crashes while working on the
    job
    """

    def __init__(self, job, ack, delivery_tag):
        self.jobName = job
        self.ack = ack
        self.delivery_tag = delivery_tag
        message = "Job Transcription failed"
        super().__init__(message)
